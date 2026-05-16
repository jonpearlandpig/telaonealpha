import { NextResponse } from 'next/server'
import { fetchShowTelaFeed, validateNotionEnv } from '@/lib/notion/showtela'

export const runtime = 'nodejs'

export async function GET() {
  const { missing } = validateNotionEnv()
  if (missing.length) {
    return NextResponse.json({ error: `Missing env vars: ${missing.join(', ')}` }, { status: 500 })
  }

  try {
    const feed = await fetchShowTelaFeed()
    return NextResponse.json(feed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected feed error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
