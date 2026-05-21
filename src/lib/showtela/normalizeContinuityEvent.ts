export type NormalizeInput = {
  title: string
  transcript: string
  severity: string
  type: string
  submittedBy: string
  taggedPerson: string
  notes: string
}

export type ContinuityNormalized = {
  headline: string
  summary: string
  transcriptRaw: string
  transcriptClean: string
  entities: string[]
  people: string[]
  pressure: 'High' | 'Medium' | 'Low'
  actionItems: string[]
  category: string
  tags: string[]
}

function mapSeverity(s: string): ContinuityNormalized['pressure'] {
  const v = (s ?? '').toLowerCase()
  return v === 'high' ? 'High' : v === 'low' ? 'Low' : 'Medium'
}

function fallback(input: NormalizeInput): ContinuityNormalized {
  return {
    headline: input.title.slice(0, 60) || 'Untitled continuity item',
    summary: input.transcript.slice(0, 220),
    transcriptRaw: input.transcript,
    transcriptClean: input.transcript,
    entities: [],
    people: input.taggedPerson ? [input.taggedPerson] : [],
    pressure: mapSeverity(input.severity),
    actionItems: [],
    category: input.type || 'Note',
    tags: [],
  }
}

export async function normalizeContinuityEvent(input: NormalizeInput): Promise<ContinuityNormalized> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[normalizeContinuityEvent] ANTHROPIC_API_KEY not set — using fallback')
    return fallback(input)
  }

  const context = [
    input.transcript ? `Transcript: ${input.transcript}` : null,
    input.title ? `Title: ${input.title}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
    input.taggedPerson ? `Tagged: ${input.taggedPerson}` : null,
    input.submittedBy ? `Submitted by: ${input.submittedBy}` : null,
    input.type ? `Type: ${input.type}` : null,
  ].filter(Boolean).join('\n')

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are an operational intelligence layer for a touring musical production (Crusade: The Musical). Transform this raw voice/text intake into clean operational continuity data.

${context}

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "headline": "concise action-oriented title, max 60 chars",
  "summary": "1-2 sentence operational summary, max 220 chars, no filler",
  "transcriptClean": "cleaned transcript with filler words and repetition removed",
  "entities": ["vendor names, locations, production elements"],
  "people": ["named individuals only"],
  "pressure": "High or Medium or Low",
  "actionItems": ["specific next actions"],
  "category": "one of: Logistics, People, Venue, Communication, Finance, Production, Note",
  "tags": ["2-4 short lowercase tags"]
}`,
        }],
      }),
    })
  } catch (err) {
    console.error('[normalizeContinuityEvent] fetch threw:', String(err))
    return fallback(input)
  }

  if (!res.ok) {
    console.error('[normalizeContinuityEvent] Claude API error:', res.status)
    return fallback(input)
  }

  const data = await res.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text ?? '{}'

  let parsed: Partial<ContinuityNormalized>
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as Partial<ContinuityNormalized>
  } catch {
    console.error('[normalizeContinuityEvent] failed to parse response:', text.slice(0, 200))
    return fallback(input)
  }

  console.log('[normalizeContinuityEvent] normalized:', {
    headline: parsed.headline,
    pressure: parsed.pressure,
    tags: parsed.tags,
    category: parsed.category,
    actionItemCount: (parsed.actionItems ?? []).length,
  })

  return {
    headline: ((parsed.headline ?? input.title) as string).slice(0, 60) || 'Untitled',
    summary: ((parsed.summary ?? input.transcript) as string).slice(0, 220),
    transcriptRaw: input.transcript,
    transcriptClean: (parsed.transcriptClean ?? input.transcript) as string,
    entities: (parsed.entities ?? []) as string[],
    people: (parsed.people ?? (input.taggedPerson ? [input.taggedPerson] : [])) as string[],
    pressure: (parsed.pressure ?? mapSeverity(input.severity)) as ContinuityNormalized['pressure'],
    actionItems: (parsed.actionItems ?? []) as string[],
    category: (parsed.category ?? input.type ?? 'Note') as string,
    tags: (parsed.tags ?? []) as string[],
  }
}
