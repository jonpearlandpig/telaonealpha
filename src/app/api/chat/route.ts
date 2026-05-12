import { anthropic, buildSystemPrompt, MODEL } from '@/lib/anthropic'

export async function POST(req: Request) {
  try {
    const { messages, wikiContext } = await req.json()
    const systemPrompt = buildSystemPrompt(wikiContext || '')

    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

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
