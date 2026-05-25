import { getAnthropicClient, buildSystemPrompt, MODEL } from '@/lib/anthropic'

function buildFallbackOperationalReply(question: string, operationalContext?: string) {
  const normalizedQuestion = question.trim().toLowerCase()
  const unresolvedMatch = operationalContext?.match(/Unresolved items:\s*([^\n]+)/i)
  const latestMatch = operationalContext?.match(/Latest continuity:\s*([^\n]+)/i)
  const operationMatch = operationalContext?.match(/Priority operation:\s*([^\n]+)/i)

  if (normalizedQuestion.includes('blocking') || normalizedQuestion.includes('attention') || normalizedQuestion.includes('unresolved')) {
    return [
      unresolvedMatch ? `${unresolvedMatch[0]}.` : 'No unresolved items are currently hydrated.',
      operationMatch ? `${operationMatch[0]}.` : null,
      latestMatch ? `Closest active signal is ${latestMatch[1]}.` : null,
    ].filter(Boolean).join(' ')
  }

  if (normalizedQuestion.includes('changed') || normalizedQuestion.includes('latest')) {
    return latestMatch
      ? `Latest operational movement: ${latestMatch[1]}.`
      : 'No recent continuity signal is currently hydrated.'
  }

  return latestMatch
    ? `Operational context is limited right now. Start with ${latestMatch[1]}.`
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

    const operationalBlock = operationalContext
      ? `\n## Live Operational Context\n${operationalContext}`
      : ''

    const systemPrompt = buildSystemPrompt(wikiContext || '') + operationalBlock
    const fallback = buildFallbackOperationalReply(messages?.at(-1)?.content ?? '', operationalContext)

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
