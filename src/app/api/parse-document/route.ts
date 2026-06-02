import { NextRequest, NextResponse } from 'next/server'
import { getClaudeClient } from '@/lib/ai/claude'

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
    } else if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const client = getClaudeClient()
      const result = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0,
        system: 'Extract only visible text from the image. Preserve headings, table rows, pipes, phone numbers, emails, and line breaks. Do not infer, summarize, complete, or add text.',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: buffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'OCR this image exactly. Return only extracted text.',
            },
          ],
        }],
      })
      text = result.content
        .map((block) => block.type === 'text' ? block.text : '')
        .join('\n')
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
    }

    return NextResponse.json({
      text: text.trim(),
      charCount: text.trim().length,
      fileName,
      mimeType,
      extractionStatus: text.trim().length > 0 ? 'extracted' : 'failed',
    })
  } catch (err) {
    console.error('[parse-document] extraction failed:', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
