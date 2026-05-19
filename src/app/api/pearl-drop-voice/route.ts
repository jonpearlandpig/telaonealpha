import { NextRequest, NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'
const notionHeaders = () => ({
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
})

async function askClaude(transcript: string): Promise<{ type: string; data: Record<string, string> }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are parsing a voice note from a touring production operator. Extract structured data and classify it.

Voice note: "${transcript}"

Respond with ONLY valid JSON in one of these formats:

If it's a person/contact:
{"type":"person","name":"Full Name","role":"their role","phone":"phone if mentioned","email":"email if mentioned","notes":"any other context"}

If it's an unresolved item:
{"type":"unresolved","title":"short title","severity":"high|medium|low","operation":"Travel|Logistics|Venues|Hospitality|Security","owner":"person name if mentioned","notes":"details"}

If it's a feed update:
{"type":"feed","headline":"short headline","summary":"full details","owner":"speaker name if mentioned"}

If unclear:
{"type":"note","content":"the full transcript"}`
      }]
    })
  })
  const data = await res.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text ?? '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { type: 'note', data: { content: transcript } }
  }
}

async function createNotionPage(databaseId: string, properties: Record<string, unknown>) {
  return fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  })
}

export async function POST(req: NextRequest) {
  const { transcript } = await req.json() as { transcript: string }
  if (!transcript?.trim()) return NextResponse.json({ error: 'No transcript' }, { status: 400 })

  const parsed = await askClaude(transcript)

  try {
    if (parsed.type === 'person') {
      const peopleDb = process.env.NOTION_CRUSADE_PEOPLE_DB_ID
      await createNotionPage(peopleDb!, {
        Name: { title: [{ text: { content: parsed.data?.name ?? 'Unknown' } }] },
        Role: { rich_text: [{ text: { content: parsed.data?.role ?? '' } }] },
        Notes: { rich_text: [{ text: { content: `📞 ${parsed.data?.phone ?? ''} ✉ ${parsed.data?.email ?? ''} — ${parsed.data?.notes ?? ''}`.trim() } }] },
        Active: { checkbox: false },
        Partner: { checkbox: true },
        ShowTELA_Function: { select: { name: 'Fluency Partner' } },
      })
      return NextResponse.json({ success: true, type: 'person', message: `${parsed.data?.name} added to People registry` })
    }

    if (parsed.type === 'unresolved') {
      const unresolvedDb = process.env.NOTION_CRUSADE_UNRESOLVED_DB_ID
      await createNotionPage(unresolvedDb!, {
        Title: { title: [{ text: { content: parsed.data?.title ?? transcript.slice(0, 80) } }] },
        Severity: { select: { name: parsed.data?.severity ?? 'medium' } },
        Operation: { rich_text: [{ text: { content: parsed.data?.operation ?? '' } }] },
        Owner: { rich_text: [{ text: { content: parsed.data?.owner ?? '' } }] },
        Notes: { rich_text: [{ text: { content: parsed.data?.notes ?? '' } }] },
        Blocking: { checkbox: false },
        Aging: { number: 0 },
      })
      return NextResponse.json({ success: true, type: 'unresolved', message: `Unresolved item added: ${parsed.data?.title}` })
    }

    if (parsed.type === 'feed') {
      const eventsDb = process.env.NOTION_CRUSADE_EVENTS_DB_ID
      await createNotionPage(eventsDb!, {
        Name: { title: [{ text: { content: parsed.data?.headline ?? transcript.slice(0, 80) } }] },
        Summary: { rich_text: [{ text: { content: parsed.data?.summary ?? transcript } }] },
        Owner: { rich_text: [{ text: { content: parsed.data?.owner ?? 'Jon Hartman' } }] },
        Status: { select: { name: 'Active' } },
        Priority: { select: { name: 'Medium' } },
      })
      return NextResponse.json({ success: true, type: 'feed', message: `Feed update added: ${parsed.data?.headline}` })
    }

    return NextResponse.json({ success: true, type: 'note', message: 'Note captured', transcript })
  } catch (e) {
    console.error('Pearl Drop error:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
