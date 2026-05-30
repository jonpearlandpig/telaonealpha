import { anthropic } from '@/lib/ai/claude'

export type LLMNormalizationResult = {
  headline: string
  summary: string
  entities: string[]
  tags: string[]
  pressure: 'low' | 'medium' | 'high' | 'critical'
  nextActions: string[]
  confidence: number
  classification:
    | 'venue'
    | 'staffing'
    | 'logistics'
    | 'hospitality'
    | 'legal'
    | 'financial'
    | 'creative'
    | 'technical'
    | 'unresolved'
    | 'update'
    | 'decision'
}

const NORMALIZATION_PROMPT = `You are an operational continuity normalizer for ShowTELA.

You receive raw operational input — voice transcripts, notes, updates — and
extract structured operational intelligence from them.

Respond ONLY with a valid JSON object. No preamble. No explanation.
No markdown. No backticks. Just the JSON object.

Required fields:
- headline: one line, what happened, max 80 characters
- summary: 2-3 sentences, operational meaning and significance
- entities: array of people/venues/orgs/projects explicitly named
- tags: array of operational category tags in UPPERCASE
- pressure: "low" | "medium" | "high" | "critical"
- nextActions: array of concrete next steps implied by this input
- classification: one of venue|staffing|logistics|hospitality|legal|financial|creative|technical|unresolved|update|decision

Pressure guidelines:
- critical: blocking production, time-sensitive, financial exposure
- high: needs attention within 24 hours, affects multiple people
- medium: needs attention this week, operational impact
- low: informational, no immediate action required

Be concise. Be operational. Surface what matters.`

export async function llmNormalize(
  rawInput: string,
  mode: string,
  context?: {
    owner?: string
    operation?: string
    linkedEntity?: string
  },
  fileContents?: string[],
): Promise<LLMNormalizationResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const combinedParts: string[] = []
  if (rawInput?.trim()) combinedParts.push(rawInput.trim())
  for (const fc of fileContents ?? []) {
    if (fc.trim()) combinedParts.push(fc.trim())
  }
  if (combinedParts.length === 0) return null

  // Cap combined input at ~8000 chars to stay well within haiku token budget
  const combined = combinedParts.join('\n\n---\n\n').slice(0, 8000)

  const contextBlock = context
    ? `\nContext: owner=${context.owner ?? 'unknown'}, operation=${context.operation ?? 'none'}, entity=${context.linkedEntity ?? 'none'}`
    : ''

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: NORMALIZATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Mode: ${mode}${contextBlock}\n\nRaw input:\n${combined}`,
        },
      ],
    })

    const text = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .replace(/```json|```/g, '')
      .trim()

    const parsed = JSON.parse(text) as LLMNormalizationResult
    return parsed
  } catch (err) {
    console.error('[llm-normalize] failed:', err)
    return null
  }
}
