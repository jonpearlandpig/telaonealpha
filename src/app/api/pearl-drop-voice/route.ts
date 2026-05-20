import { NextRequest, NextResponse } from 'next/server'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import { deterministicArtifactId } from '@/lib/artifacts/artifactStore'

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
        content: `Parse this voice note from a touring production operator. Extract ALL information you can find.

Voice note: "${transcript}"

Respond with ONLY valid JSON:
{"type":"Person or Unresolved or Feed or Note","title":"short title under 80 chars","name":"full name if person mentioned","role":"job title or role","phone":"phone number","email":"email address","severity":"high or medium or low","notes":"any remaining context or details"}`
      }]
    })
  })
  const data = await res.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text ?? '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { type: 'Note', title: transcript.slice(0, 80) }
  }
}

export async function POST(req: NextRequest) {
  const { transcript, taggedPerson, submittedBy } = await req.json() as {
    transcript: string
    taggedPerson?: string
    submittedBy?: string
  }
  if (!transcript?.trim()) return NextResponse.json({ error: 'No transcript' }, { status: 400 })

  const parsed = await askClaude(transcript)
  const inboxDb = process.env.NOTION_TELA_INBOX_DB_ID ?? '004750ec83914561b1d20b669dd00a3f'

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: inboxDb },
      properties: {
        Title: { title: [{ text: { content: parsed.title ?? transcript.slice(0, 80) } }] },
        Transcript: { rich_text: [{ text: { content: transcript } }] },
        Type: { select: { name: parsed.type ?? 'Note' } },
        Status: { select: { name: 'Raw' } },
        Source: { select: { name: 'Voice' } },
        Severity: { select: { name: parsed.severity ?? 'medium' } },
        'Tagged Person': { rich_text: [{ text: { content: taggedPerson ?? '' } }] },
        'Extracted Name': { rich_text: [{ text: { content: parsed.name ?? '' } }] },
        'Extracted Role': { rich_text: [{ text: { content: parsed.role ?? '' } }] },
        'Extracted Phone': { rich_text: [{ text: { content: parsed.phone ?? '' } }] },
        'Extracted Email': { rich_text: [{ text: { content: parsed.email ?? '' } }] },
        Notes: { rich_text: [{ text: { content: parsed.notes ?? '' } }] },
        'Submitted By': { rich_text: [{ text: { content: submittedBy ?? 'Jon Hartman' } }] },
      }
    })
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Notion inbox error:', JSON.stringify(data))
    return NextResponse.json({ error: 'Failed to write to TELA Inbox' }, { status: 500 })
  }

  // Persist to Supabase durable layer so it appears in ContinuityPanel hydration
  const createdAt = new Date().toISOString()
  const title = parsed.title ?? transcript.slice(0, 80)
  const artifactId = deterministicArtifactId({ title, threadId: 'pearl-drop', sessionId: 'voice', createdAt })
  const textContent = [
    transcript,
    parsed.notes ? `Notes: ${parsed.notes}` : null,
    taggedPerson ? `Tagged: ${taggedPerson}` : null,
    parsed.name ? `Person: ${parsed.name}` : null,
    parsed.role ? `Role: ${parsed.role}` : null,
    submittedBy ? `Submitted by: ${submittedBy}` : null,
  ].filter(Boolean).join('\n')

  persistDurableContinuity('default-workspace', {
    artifacts: [{
      id: artifactId,
      title,
      threadId: 'pearl-drop',
      sessionId: 'voice',
      prompt: transcript,
      text: textContent,
      mimeType: 'text/plain',
      fileName: `pearl-drop-${artifactId}.txt`,
      entities: [taggedPerson, parsed.name].filter(Boolean) as string[],
      projects: ['telaone'],
      lineageId: 'pearl-drop-voice',
      artifactGroupId: 'pearl-drop',
      createdAt,
      pinned: false,
      classification: 'runtime_artifact',
    }],
    entities: [],
    snapshots: [],
  }).catch((err) => console.error('[pearl-drop] durable persist failed:', err))

  return NextResponse.json({
    success: true,
    message: `Captured in TELA Inbox — ${parsed.type ?? 'Note'}: ${parsed.title ?? transcript.slice(0, 40)}`,
    type: parsed.type,
  })
}
