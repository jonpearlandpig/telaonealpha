import { getAnthropicClient, buildSystemPrompt, MODEL } from '@/lib/anthropic'

function buildFallbackOperationalReply(question: string, operationalContext?: string) {
  const lines = (operationalContext ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const activeOperations = lines.find((line) => line.startsWith('Active operations:'))?.replace('Active operations:', '').trim() ?? 'none'
  const unresolved = lines.find((line) => line.startsWith('Unresolved items:'))?.replace('Unresolved items:', '').trim() ?? '0'
  const latest = lines.find((line) => line.startsWith('Latest continuity:'))?.replace('Latest continuity:', '').trim() ?? 'none'
  const feedLines = lines.filter((line) => line.startsWith('- '))
  const lower = question.toLowerCase()

  if (lower.includes('blocking') || lower.includes('blocked') || lower.includes('unresolved')) {
    return unresolved === '0'
      ? `No unresolved items are currently hydrated. Closest active signal is ${latest}.`
      : `${unresolved} unresolved items are currently hydrated. Closest active signal is ${latest}.`
  }

  if (lower.includes('changed') || lower.includes('today')) {
    return feedLines[0]?.replace(/^- /, '') ?? `Latest continuity is ${latest}.`
  }

  if (lower.includes('attention') || lower.includes('next')) {
    return `Active operations: ${activeOperations}. Latest continuity: ${latest}.`
  }

  return `Active operations: ${activeOperations}. Unresolved items: ${unresolved}. Latest continuity: ${latest}.`
}

function streamSingleMessage(text: string) {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
  )
}

export async function POST(req: Request) {
  try {
    const { messages, wikiContext, operationalContext } = await req.json()
    const operationalBlock = operationalContext
      ? `\n## Live Operational Context\n${operationalContext}`
      : ''
    const systemPrompt = buildSystemPrompt(wikiContext || '') + operationalBlock

    let stream
    try {
      stream = await getAnthropicClient().messages.stream({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages,
      })
    } catch {
      return streamSingleMessage(
        buildFallbackOperationalReply(
          messages?.[messages.length - 1]?.content ?? '',
          operationalContext,
        ),
      )
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
