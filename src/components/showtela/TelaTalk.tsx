'use client'

import { useRef, useState } from 'react'
import type { ContinuityEvent, OperationEntity, UnresolvedObject } from '@/lib/showtela/types'

type ThreadMessage = {
  id: string
  role: 'user' | 'tela'
  text: string
}

async function askTELA(
  question: string,
  context: {
    operations: OperationEntity[]
    unresolved: UnresolvedObject[]
    feed: ContinuityEvent[]
  },
  onDelta: (value: string) => void,
): Promise<string> {
  const operationalContext = [
    `Active operations: ${context.operations.map((operation) => operation.title).join(', ') || 'none'}`,
    `Unresolved items: ${context.unresolved.length ?? 0}`,
    `Latest continuity: ${context.feed[0]?.headline ?? 'none'}`,
    context.feed
      .slice(0, 3)
      .map((event) => `- ${event.headline}: ${(event.summary ?? event.body ?? '').slice(0, 100)}`)
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: question }],
        operationalContext,
        wikiContext: '',
      }),
    })

    if (!response.ok || !response.body) {
      return 'Operational context unavailable.'
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') return result || 'No operational signal.'

          try {
            const parsed = JSON.parse(json) as { text?: string }
            if (parsed.text) {
              result += parsed.text
              onDelta(result)
            }
          } catch {
            // Skip malformed chunks so streaming stays resilient.
          }
        }
      }
    }

    return result || 'No operational signal.'
  } catch {
    return 'TELA is not available right now.'
  }
}

export function TelaTalk({
  feed,
  operations,
  unresolvedItems,
}: {
  feed: ContinuityEvent[]
  operations: OperationEntity[]
  unresolvedItems: UnresolvedObject[]
}) {
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState<ThreadMessage[]>([
    {
      id: 'tela-pinned',
      role: 'tela',
      text: 'Operational context stays anchored here. Ask what changed, what is blocked, or where pressure is building.',
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const counter = useRef(0)

  async function submitQuestion(value: string) {
    const question = value.trim()
    if (!question || isLoading) return

    counter.current += 1
    const userId = `user-${counter.current}`
    const telaId = `tela-${counter.current}`

    setDraft('')
    setIsLoading(true)
    setThread((current) => [
      ...current,
      { id: userId, role: 'user', text: question },
      { id: telaId, role: 'tela', text: '' },
    ])

    const finalText = await askTELA(
      question,
      {
        operations,
        unresolved: unresolvedItems,
        feed,
      },
      (delta) => {
        setThread((current) =>
          current.map((message) => (message.id === telaId ? { ...message, text: delta } : message)),
        )
      },
    )

    setThread((current) =>
      current.map((message) => (message.id === telaId ? { ...message, text: finalText } : message)),
    )
    setIsLoading(false)
  }

  return (
    <section className="mx-5 mt-6 rounded-[28px] border border-[#E8DCC4] bg-[linear-gradient(180deg,#FFFDF8_0%,#F4EBDD_100%)] p-4 shadow-[0_18px_38px_rgba(20,18,16,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7049]">TelaTalk</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#17130F]">Operational intelligence</h2>
        </div>
        <div className="rounded-full bg-[#F4E9D6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6725]">
          Live
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['What changed today?', 'What’s blocking us right now?', 'What needs attention next?'].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => submitQuestion(prompt)}
            className="rounded-full border border-[#DDD1BF] bg-[#F8F3EA] px-3 py-2 text-[12px] font-medium text-[#5E5348]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {thread.map((message) => (
          <div
            key={message.id}
            className={`rounded-[22px] px-4 py-3 shadow-[0_10px_26px_rgba(17,17,17,0.04)] ${
              message.role === 'tela'
                ? 'border border-[#E3D8C7] bg-[#FFFDF8] text-[#171411]'
                : 'ml-8 bg-[#1A1611] text-[#F7E8C2]'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${message.role === 'tela' ? 'text-[#8A7351]' : 'text-[#D7BC7F]'}`}>
              {message.role === 'tela' ? 'TELA' : 'You'}
            </p>
            <p className={`mt-1 text-[13px] leading-relaxed ${message.role === 'tela' ? 'text-[#5E5348]' : 'text-[#F2E6CE]'}`}>
              {message.text || 'Reading the field...'}
            </p>
          </div>
        ))}
        {isLoading ? (
          <div className="rounded-[20px] border border-[#E3D8C7] bg-white/70 px-4 py-3 text-[12px] text-[#7E6D56]">
            TELA is tracing live operational context...
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2 rounded-[18px] border border-[#E1D4C2] bg-[#FCFAF7] p-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitQuestion(draft)
          }}
          placeholder="Ask what changed..."
          className="min-h-[40px] min-w-0 flex-1 bg-transparent px-2 text-[13px] text-[#171411] outline-none placeholder:text-[#9A8C79]"
        />
        <button
          type="button"
          onClick={() => submitQuestion(draft)}
          disabled={isLoading}
          className="min-h-[40px] rounded-[14px] bg-[#17130F] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F7E8C2] disabled:opacity-60"
        >
          Ask
        </button>
      </div>
    </section>
  )
}
