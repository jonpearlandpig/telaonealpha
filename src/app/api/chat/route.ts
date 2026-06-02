import { getAnthropicClient, buildSystemPrompt, MODEL } from '@/lib/anthropic'
import { loadDurableContinuity } from '@/lib/runtime/durableMemory'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { answerRoleFromEvidenceArtifacts } from '@/lib/showtela/evidenceAuthority'

function requestedRole(question: string) {
  const normalized = question.trim()
  const whoMatch = normalized.match(/^who\s+is\s+the\s+(.+?)\??$/i)
  if (whoMatch?.[1]) return whoMatch[1].trim()
  const roleMatch = normalized.match(/\b(Tour Photographer|Tour Manager|Production Manager|Lighting Director|FOH Engineer|Video Director|Stage Manager)\b/i)
  return roleMatch?.[1]?.trim()
}

function buildFallbackOperationalReply(question: string, operationalContext?: string) {
  const normalizedQuestion = question.trim().toLowerCase()
  const blockersMatch = operationalContext?.match(/Blockers:\s*([^\n]+)/i)
  const movementMatch = operationalContext?.match(/Movement:\s*([^\n]+)/i)
  const readinessMatch = operationalContext?.match(/Readiness:\s*([^\n]+)/i)
  const latestMatch = operationalContext?.match(/Latest continuity:\s*([^\n]+)/i)

  if (normalizedQuestion.includes('blocking') || normalizedQuestion.includes('attention') || normalizedQuestion.includes('unresolved')) {
    return [
      blockersMatch ? `${blockersMatch[0]}.` : 'No blocker chain is currently hydrated.',
      readinessMatch ? `${readinessMatch[0]}.` : null,
      latestMatch ? `Closest active signal is ${latestMatch[1]}.` : null,
    ].filter(Boolean).join(' ')
  }

  if (normalizedQuestion.includes('changed') || normalizedQuestion.includes('latest')) {
    return latestMatch
      ? `Latest operational movement: ${latestMatch[1]}.`
      : 'No recent continuity signal is currently hydrated.'
  }

  return latestMatch
    ? `Operational context is limited right now. Start with ${latestMatch[1]}.${movementMatch ? ` ${movementMatch[0]}.` : ''}`
    : 'Operational context is limited right now.'
}

function streamSingleMessage(text: string) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

export async function POST(req: Request) {
  try {
    const { messages, wikiContext, operationalContext } = await req.json()
    const latestQuestion = messages?.at(-1)?.content ?? ''
    const role = requestedRole(latestQuestion)
    if (role) {
      const answer = await loadDurableContinuity(SHOWTELA_WORKSPACE_ID)
        .then((durable) => answerRoleFromEvidenceArtifacts(durable.artifacts, role))
        .catch((err) => {
          console.error('[chat] evidence lookup failed:', err)
          return null
        })
      const text = answer
        ? [
          answer.answer,
          '',
          `SOURCE FILE: ${answer.sourceFile}`,
          `SOURCE SECTION: ${answer.sourceSection}`,
          `MATCHING TEXT: ${answer.matchingText}`,
          `EVIDENCE CHUNK ID: ${answer.evidenceChunkId}`,
        ].join('\n')
        : 'Not found in current ShowTELA sources.'

      return new Response(streamSingleMessage(text), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const operationalBlock = operationalContext
      ? `\n## Live Operational Context\n${operationalContext}`
      : ''

    const systemPrompt = buildSystemPrompt(wikiContext || '') + operationalBlock
    const fallback = buildFallbackOperationalReply(latestQuestion, operationalContext)

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(streamSingleMessage(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    let stream
    try {
      stream = await getAnthropicClient().messages.stream({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages,
      })
    } catch (err) {
      console.error('[chat] anthropic stream init failed:', err)
      return new Response(streamSingleMessage(fallback), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const errData = `data: ${JSON.stringify({ error: String(err) })}\n\n`
          controller.enqueue(encoder.encode(errData))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
