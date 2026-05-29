import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType: string = file.type || ''
    const fileName: string = file.name || 'unknown'
    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

    let text = ''

    if (mimeType === 'application/pdf' || ext === 'pdf') {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      text = result.text
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (
      mimeType.startsWith('text/') ||
      ext === 'txt' ||
      ext === 'md' ||
      ext === 'markdown'
    ) {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
    }

    return NextResponse.json({
      text: text.trim(),
      charCount: text.trim().length,
      fileName,
      mimeType,
    })
  } catch (err) {
    console.error('[parse-document] extraction failed:', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
