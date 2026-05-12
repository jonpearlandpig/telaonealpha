import { NextResponse } from 'next/server'
import { createPearlBoxEntry, fetchPearlBox } from '@/lib/notion'

export async function GET() {
  try {
    const items = await fetchPearlBox()
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { content, source } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const result = await createPearlBoxEntry(content.trim(), source || 'TELA')
    return NextResponse.json({ success: true, id: result.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
