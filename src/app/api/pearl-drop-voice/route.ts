import { NextRequest, NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'
const notionHeaders = () => ({
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
})

async function askClaude(transcript: string): Promise<Record<string, string>> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Parse this voice note from a touring production operator and extract structured data.

Voice note: "${transcript}"

Respond with ONLY valid JSON in one of these formats:

If it mentions a person or contact:
{"type":"person","name":"Full Name","role":"their role or job title","phone":"phone if mentioned","email":"email if mentioned","notes":"any other context"}

If it mentions something unresolved, blocked, or needs attention:
{"type":"unresolved","title":"short descriptive title under 80 chars","severity":"high or medium or low","operation":"Travel or Logistics or Venues or Hospitality or Security","owner":"person name if mentioned","notes":"full details"}

If it is a general update or announcement:
{"type":"feed","headline":"short headline under 80 chars","summary":"full details","owner":"speaker name if mentioned"}

Respond with JSON only. No explanation.`
      }]
    })
  })
  const data = await res.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text ?? '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { type: 'feed', headline: transcript.slice(0, 80), summary: transcript }
  }
}

async function notionCreate(databaseId: string, properties: Record<string, unknown>) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  })
  const data = await res.json()
  if (!res.ok) console.error('Notion error:', JSON.stringify(data))
  return res.ok
}

export async function POST(req: NextRequest) {
  const { transcript } = await req.json() as { transcript: string }
  if (!transcript?.trim()) return NextResponse.json({ error: 'No transcript' }, { status: 400 })

  const parsed = await askClaude(transcript)
  const type = parsed.type

  try {
    if (type === 'person') {
      const notes = [`📞 ${parsed.phone ?? ''}`, `✉ ${parsed.email ?? ''}`, parsed.notes ?? ''].filter(Boolean).join(' ')
      const ok = await notionCreate(process.env.NOTION_CRUSADE_PEOPLE_DB_ID!, {
        Name: { title: [{ text: { content: parsed.name ?? 'Unknown' } }] },
        Role: { rich_text: [{ text: { content: parsed.role ?? '' } }] },
        Notes: { rich_text: [{ text: { content: notes } }] },
        Active: { checkbox: false },
        Partner: { checkbox: true },
        Pressure: { select: { name: 'low' } },
        Unresolved: { number: 0 },
        Updates: { number: 0 },
      })
      if (!ok) return NextResponse.json({ error: 'Failed to write to Notion' }, { status: 500 })
      return NextResponse.json({ success: true, type: 'person', message: `${parsed.name ?? 'Contact'} added to People registry` })
    }

    if (type === 'unresolved') {
      const ok = await notionCreate(process.env.NOTION_CRUSADE_UNRESOLVED_DB_ID!, {
        Title: { title: [{ text: { content: parsed.title ?? transcript.slice(0, 80) } }] },
        Severity: { select: { name: parsed.severity ?? 'medium' } },
        Operation: { rich_text: [{ text: { content: parsed.operation ?? '' } }] },
        Owner: { rich_text: [{ text: { content: parsed.owner ?? '' } }] },
        Notes: { rich_text: [{ text: { content: parsed.notes ?? '' } }] },
        Blocking: { checkbox: false },
        Aging: { number: 0 },
        Status: { select: { name: 'Open' } },
      })
      if (!ok) return NextResponse.json({ error: 'Failed to write to Notion' }, { status: 500 })
      return NextResponse.json({ success: true, type: 'unresolved', message: `Unresolved added: ${parsed.title ?? transcript.slice(0, 40)}` })
    }

    // Default: feed
    const ok = await notionCreate(process.env.NOTION_CRUSADE_EVENTS_DB_ID!, {
      Name: { title: [{ text: { content: parsed.headline ?? transcript.slice(0, 80) } }] },
      Summary: { rich_text: [{ text: { content: parsed.summary ?? transcript } }] },
      Owner: { rich_text: [{ text: { content: parsed.owner ?? 'Jon Hartman' } }] },
      Status: { select: { name: 'Active' } },
      Priority: { select: { name: 'Medium' } },
    })
    if (!ok) return NextResponse.json({ error: 'Failed to write to Notion' }, { status: 500 })
    return NextResponse.json({ success: true, type: 'feed', message: `Feed updated: ${parsed.headline ?? transcript.slice(0, 40)}` })

  } catch (e) {
    console.error('Pearl Drop error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
