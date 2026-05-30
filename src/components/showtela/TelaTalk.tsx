'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ContinuityIngestionInput } from '@/lib/continuity/normalize-ingestion'
import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import type { ContinuityEvent } from '@/lib/showtela/types'
import type { OperationalProjection } from '@/lib/runtime/state/model'
import type { OperationEntity, UnresolvedItem } from './types'

type AutoscanAction = {
  id: string
  label: string
  detail: string
}

type AutoscanSummary = {
  currentTruth: string
  mattersNow: string
  nextMovement: string
  suggestedActions: AutoscanAction[]
  latestChange?: string
  activeOperators: string[]
}

export function TelaTalk({
  autoscan,
  feed = [],
  operations = [],
  unresolvedItems = [],
  calendarEvents = [],
  submittedBy,
  onContinuityIngest,
  operationalProjection,
}: {
  autoscan: AutoscanSummary
  feed?: ContinuityEvent[]
  operations?: OperationEntity[]
  unresolvedItems?: UnresolvedItem[]
  calendarEvents?: OperationalCalendarEvent[]
  submittedBy?: string
  onContinuityIngest?: (input: ContinuityIngestionInput) => Promise<boolean>
  operationalProjection?: OperationalProjection
}) {
  const promptOptions = [
    'What changed today?',
    'What requires attention?',
    'What shifted operationally?',
    'What unresolved pressure exists?',
  ]
  const [draft, setDraft] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [thread, setThread] = useState<Array<{ id: string; role: 'user' | 'tela'; text: string }>>([
    {
      id: 'tela-pinned',
      role: 'tela',
      text: `${operationalProjection?.summary.currentTruth ?? autoscan.currentTruth} ${operationalProjection?.summary.mattersNow ?? autoscan.mattersNow} ${operationalProjection?.summary.nextMovement ?? autoscan.nextMovement}`,
    },
  ])
  const messageCounter = useRef(0)

  const derivedContext = useMemo(() => {
    const blocked = unresolvedItems.filter((item) => item.blocking)
    return {
      unresolvedCount: unresolvedItems.length,
      blockedCount: blocked.length,
      priorityOperation: operations[0],
      latestContinuity: feed[0],
      pressureEvents: calendarEvents.filter((event) => event.unresolvedCount > 0 || ['pressure', 'critical', 'needs_decision'].includes(event.pressureState)),
    }
  }, [calendarEvents, feed, operations, unresolvedItems])

  function isQuestionPrompt(value: string) {
    const normalized = value.trim().toLowerCase()
    return normalized.endsWith('?') || promptOptions.some((prompt) => prompt.toLowerCase() === normalized)
  }

  function isReplayQuery(value: string) {
    const normalized = value.trim().toLowerCase()
    return [
      'what happened',
      'replay',
      'history',
      'what changed',
      'since yesterday',
      'last week',
    ].some((phrase) => normalized.includes(phrase))
  }

  function createQuickUpdatePayload(value: string): ContinuityIngestionInput {
    const lines = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const body = value.trim()
    const headlineSource = lines[0] ?? body
    const headline = headlineSource.length > 80 ? `${headlineSource.slice(0, 77).trimEnd()}...` : headlineSource

    return {
      mode: 'quick-update',
      headline,
      body,
      owner: submittedBy,
      tags: ['note'],
    }
  }

  const askTELA = useCallback(async (question: string): Promise<string> => {
    if (isReplayQuery(question)) {
      try {
        const params = new URLSearchParams({
          workspaceId: SHOWTELA_WORKSPACE_ID,
          query: question,
        })
        const res = await fetch(`/api/runtime/continuity/replay?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return 'Runtime replay is not available right now.'
        const payload = await res.json() as { answer?: string }
        return payload.answer ?? 'Runtime replay returned no structural answer.'
      } catch {
        return 'Runtime replay is not available right now.'
      }
    }

    const operationalContext = [
      `Blockers: ${operationalProjection?.blockers.map((state) => state.stateLabel).join('; ') || 'none'}`,
      `Movement: ${operationalProjection?.movement.map((state) => state.stateLabel).join('; ') || 'none'}`,
      `Readiness: ${operationalProjection?.readiness.map((state) => state.stateLabel).join('; ') || 'none'}`,
      `Dependency chains: ${operationalProjection?.dependencyChains.slice(0, 2).map((chain) => chain.join(' -> ')).join(' | ') || 'none'}`,
      `Active people: ${operations.map(o => o.label).join(', ') || 'none'}`,
      `Unresolved items: ${derivedContext.unresolvedCount} (${derivedContext.blockedCount} blocking)`,
      derivedContext.latestContinuity
        ? `Latest continuity: ${derivedContext.latestContinuity.headline}`
        : '',
      derivedContext.priorityOperation
        ? `Priority operation: ${derivedContext.priorityOperation.label} (${derivedContext.priorityOperation.unresolvedCount ?? 0} unresolved)`
        : '',
      feed.slice(0, 3).map(e => `- ${e.headline}: ${e.body?.slice(0, 100) ?? ''}`).join('\n'),
    ].filter(Boolean).join('\n')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          operationalContext,
          wikiContext: '',
        }),
      })

      if (!res.ok || !res.body) return 'TELA is not available right now.'

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = line.slice(6)
          if (json === '[DONE]') break
          try {
            const parsed = JSON.parse(json) as { text?: string; error?: string }
            if (parsed.text) result += parsed.text
          } catch { /* skip malformed chunks */ }
        }
      }

      return result || 'No operational signal derived.'
    } catch {
      return 'TELA is not available right now.'
    }
  }, [derivedContext, feed, operations, operationalProjection])

  async function submitQuestion(value: string) {
    const question = value.trim()
    if (!question) return
    messageCounter.current += 1
    const messageId = messageCounter.current
    const userMessage = { id: `user-${messageId}`, role: 'user' as const, text: question }

    if (isQuestionPrompt(question)) {
      setThread((current) => [...current, userMessage, { id: `tela-${messageId}`, role: 'tela', text: '...' }])
      setDraft('')
      setIsAsking(true)
      const answer = await askTELA(question)
      setIsAsking(false)
      setThread((current) =>
        current.map(m => m.id === `tela-${messageId}` ? { ...m, text: answer } : m)
      )
      return
    }

    if (!onContinuityIngest) {
      setThread((current) => [...current, userMessage, { id: `tela-${messageId}`, role: 'tela', text: '...' }])
      setDraft('')
      setIsAsking(true)
      const answer = await askTELA(question)
      setIsAsking(false)
      setThread((current) =>
        current.map(m => m.id === `tela-${messageId}` ? { ...m, text: answer } : m)
      )
      return
    }

    const persisted = await onContinuityIngest(createQuickUpdatePayload(question))
    setThread((current) => [
      ...current,
      userMessage,
      {
        id: `tela-${messageId}`,
        role: 'tela',
        text: persisted
          ? 'Continuity captured. I anchored it into runtime memory and it will survive refresh.'
          : 'I could not anchor that into runtime continuity. Please try again.',
      },
    ])
    setDraft('')
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] px-5 pb-32 pt-14">
      <div className="rounded-[30px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F4EDE2_100%)] p-4 shadow-[0_18px_38px_rgba(20,18,16,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[#18140F]">
              <img src="/showtela/crusade-anchor.jpg" alt="TELA" className="h-full w-full object-cover" />
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#8EA58E]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Messages</p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#17130F]">TELA</h1>
            </div>
          </div>
          <div className="rounded-full bg-[#F4E9D6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6725]">
            Present
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[#5E5348]">
          Personal first. Operational when needed.
        </p>
      </div>

      <section className="mt-4 rounded-[26px] border border-[#E3D8C7] bg-white/82 p-4 shadow-[0_14px_34px_rgba(17,17,17,0.05)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Quick asks</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {promptOptions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submitQuestion(prompt)}
              className="rounded-full border border-[#DDD1BF] bg-[#F8F3EA] px-3 py-2 text-left text-[12px] font-medium text-[#5E5348]"
            >
              {prompt}
            </button>
          ))}
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
            className="min-h-[40px] rounded-[14px] bg-[#17130F] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F7E8C2]"
          >
            Ask
          </button>
        </div>
      </section>

      <section className="mt-4 space-y-3">
        {thread.map((message, index) => (
          <div
            key={message.id}
            className={`rounded-[24px] px-4 py-3 shadow-[0_10px_26px_rgba(17,17,17,0.04)] ${
              message.role === 'tela'
                ? 'border border-[#E3D8C7] bg-[#FFFDF8] text-[#171411]'
                : 'ml-8 bg-[#1A1611] text-[#F7E8C2]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {message.role === 'tela' ? (
                  <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[#18140F]">
                    <img src="/showtela/crusade-anchor.jpg" alt="TELA" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-[#8EA58E]" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1E6D4] text-[11px] font-semibold text-[#7D6132]">
                    You
                  </div>
                )}
                <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${message.role === 'tela' ? 'text-[#8A7351]' : 'text-[#D7BC7F]'}`}>
                  {message.role === 'tela' ? 'TELA' : 'You'}
                </p>
              </div>
              {index === 0 && (
                <span className="rounded-full bg-[#F1E6D4] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#7D6132]">
                  Pinned
                </span>
              )}
            </div>
            <p className={`mt-1 text-[13px] leading-relaxed ${message.role === 'tela' ? 'text-[#5E5348]' : 'text-[#F2E6CE]'}`}>
              {message.text === '...' && isAsking ? (
                <span className="italic opacity-60">TELA is thinking…</span>
              ) : (
                message.text
              )}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-[22px] border border-[#E3D8C7] bg-white/70 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Thread presence</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">
          {feed.length} continuity / {calendarEvents.length} calendar / {unresolvedItems.length} unresolved
        </p>
        {autoscan.activeOperators.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {autoscan.activeOperators.map((name) => (
              <span key={name} className="rounded-full bg-[#F5F0E6] px-2.5 py-1 text-[11px] font-medium text-[#5E5348]">{name}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
