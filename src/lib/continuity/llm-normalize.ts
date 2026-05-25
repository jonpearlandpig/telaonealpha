import { anthropic } from '@/lib/ai/claude'
import type { ContinuityClassification, PressureLevel } from '@/lib/showtela/types'

export type LLMNormalizationResult = {
  headline: string
  summary: string
  entities: string[]
  tags: string[]
  pressure: PressureLevel
  nextActions: string[]
  confidence: number
  classification: ContinuityClassification
}

const NORMALIZATION_PROMPT = `You are an operational continuity normalizer for ShowTELA.
You receive raw operational input - voice transcripts, notes, updates - and
extract structured operational intelligence.
Respond ONLY with a valid JSON object.
No preamble.
No explanation.
No markdown.
No backticks.
Just the JSON object.
Required fields:
- headline: one line, what happened, max 80 characters
- summary: 2-3 sentences, operational meaning and significance
- entities: array of people/venues/orgs/projects explicitly named
- tags: array of operational category tags in UPPERCASE
- pressure: "low" | "medium" | "high" | "critical"
- nextActions: array of concrete next steps implied by this input
- confidence: number between 0 and 1 representing certainty of interpretation
- classification: one of venue|staffing|logistics|hospitality|legal|financial|creative|technical|unresolved|update|decision
Pressure guidelines:
- critical: blocking production, time-sensitive, financial exposure
- high: needs attention within 24 hours, affects multiple people
- medium: needs attention this week, operational impact
- low: informational, no immediate action required`

export async function llmNormalize(
  rawInput: string,
  mode: string,
  context?: {
    owner?: string
    operation?: string
    linkedEntity?: string
  },
): Promise<LLMNormalizationResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!rawInput?.trim() || rawInput.trim().length < 10) return null

  const contextBlock = context
    ? `\nContext: owner=${context.owner ?? 'unknown'}, operation=${context.operation ?? 'none'}, entity=${context.linkedEntity ?? 'none'}`
    : ''

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: NORMALIZATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Mode: ${mode}${contextBlock}\n\nRaw input:\n${rawInput.slice(0, 3000)}`,
        },
      ],
    })

    const text = response.content
      .filter((block): block is Extract<(typeof response.content)[number], { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim()

    return JSON.parse(text) as LLMNormalizationResult
  } catch (err) {
    console.error('[llm-normalize] failed:', err)
    return null
  }
}
