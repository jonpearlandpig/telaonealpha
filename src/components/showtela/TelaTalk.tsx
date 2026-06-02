'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { ContinuityIngestionInput } from '@/lib/continuity/normalize-ingestion'
import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { ContinuityEvent, TELAwhy } from '@/lib/showtela/types'
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
  workspaceId,
  proofMode,
}: {
  autoscan: AutoscanSummary
  feed?: ContinuityEvent[]
  operations?: OperationEntity[]
  unresolvedItems?: UnresolvedItem[]
  calendarEvents?: OperationalCalendarEvent[]
  submittedBy?: string
  onContinuityIngest?: (input: ContinuityIngestionInput) => Promise<boolean>
  operationalProjection?: OperationalProjection
  workspaceId: string
  proofMode?: boolean
}) {
  const promptOptions = [
    'What changed today?',
    'Why was this said?',
    'What requires attention?',
    'What changed because of it?',
  ]
  type ThreadMessage = { id: string; role: 'user' | 'tela'; text: string; why?: TELAwhy }

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

  function createAnswerWhy(input: { id: string; question: string; answerContext: string; persisted?: boolean }): TELAwhy {
    const latestWhy = feed.find((item) => item.telaWhy)?.telaWhy
    const latestCalendar = calendarEvents.find((event) => event.sourceArtifactId || event.continuityEventId)
    const eventId = latestWhy?.evidenceRefs?.eventId ?? latestCalendar?.continuityEventId
    const continuityRecordId = latestWhy?.evidenceRefs?.continuityRecordId ?? latestCalendar?.continuityEventId
    const artifactId = latestWhy?.evidenceRefs?.artifactId ?? latestCalendar?.sourceArtifactId
    const evidence = [
      input.answerContext,
      derivedContext.latestContinuity ? `Latest update: ${derivedContext.latestContinuity.headline}` : undefined,
      calendarEvents.length ? `${calendarEvents.length} calendar events in saved context` : undefined,
      unresolvedItems.length ? `${unresolvedItems.length} unresolved items in saved context` : undefined,
      operations.length ? `${operations.length} operations in saved context` : undefined,
    ].filter((item): item is string => Boolean(item))

    return {
      id: `telawhy:message:${input.id}`,
      status: latestWhy || latestCalendar ? 'verified' : input.persisted ? 'low-provenance' : 'insufficient-continuity',
      whyThisExists: input.persisted
        ? 'Why this answer exists: the operator submitted an update and ShowTELA saved it.'
        : `Why this answer exists: TELA answered "${input.question}" from the currently saved updates, operations, open items, and calendar context.`,
      evidenceRefs: {
        eventId,
        continuityRecordId,
        artifactId,
      },
      sourceArtifact: latestWhy?.sourceArtifact ?? (latestCalendar?.sourceArtifactId ? {
        id: latestCalendar.sourceArtifactId,
        title: latestCalendar.sourceArtifactTitle,
      } : undefined),
      importTimestamp: latestWhy?.importTimestamp ?? latestCalendar?.importedAt,
      author: latestWhy?.author,
      linkedEntities: Array.from(new Set([
        ...(latestWhy?.linkedEntities ?? []),
        ...feed.slice(0, 3).flatMap((item) => item.linkedEntities ?? []),
      ])),
      linkedOperations: Array.from(new Set([
        ...(latestWhy?.linkedOperations ?? []),
        ...operations.slice(0, 4).map((operation) => operation.label),
      ])),
      linkedCalendarEvents: latestCalendar ? [latestCalendar.title] : latestWhy?.linkedCalendarEvents ?? [],
      continuityEvent: latestWhy?.continuityEvent,
      evidence: [
        eventId ? `Event ID: ${eventId}` : undefined,
        continuityRecordId ? `Saved Update ID: ${continuityRecordId}` : undefined,
        artifactId ? `Source File ID: ${artifactId}` : undefined,
        ...(evidence.length > 0 ? evidence : ['Not enough saved context: no sources were available for this answer.']),
      ].filter((item): item is string => Boolean(item)),
      lineage: latestWhy?.lineage ?? [
        latestCalendar?.sourceArtifactTitle ? `Source file: ${latestCalendar.sourceArtifactTitle}` : 'Source file: missing',
        latestCalendar?.continuityEventId ? `Saved update: ${latestCalendar.continuityEventId}` : 'Saved update: missing',
        'Screen: TELA Messages',
      ],
      freshness: {
        lastUpdated: latestWhy?.freshness?.lastUpdated ?? latestCalendar?.freshnessTimestamp ?? new Date().toISOString(),
        label: latestWhy?.freshness?.label ?? 'Last updated: message answer generated from saved ShowTELA context.',
      },
    }
  }

  const [draft, setDraft] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [thread, setThread] = useState<ThreadMessage[]>([
    {
      id: 'tela-pinned',
      role: 'tela',
      text: `${operationalProjection?.summary.currentTruth ?? autoscan.currentTruth} ${operationalProjection?.summary.mattersNow ?? autoscan.mattersNow} ${operationalProjection?.summary.nextMovement ?? autoscan.nextMovement}`,
      why: createAnswerWhy({
        id: 'tela-pinned',
        question: 'Pinned operational orientation',
        answerContext: 'Sources used: latest summary, saved updates, operation pressure, and calendar presence.',
      }),
    },
  ])
  const messageCounter = useRef(0)

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
          workspaceId,
          query: question,
        })
        if (proofMode) params.set('showtela_proof', '1')
        const res = await fetch(`/api/runtime/continuity/replay?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return 'Saved history is not available right now.'
        const payload = await res.json() as { answer?: string }
        return payload.answer ?? 'Saved history returned no answer.'
      } catch {
        return 'Saved history is not available right now.'
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
        ? `Latest update: ${derivedContext.latestContinuity.headline}`
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

	      return result || 'No clear answer yet.'
    } catch {
      return 'TELA is not available right now.'
    }
  }, [derivedContext, feed, operations, operationalProjection, workspaceId, proofMode])

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
        current.map(m => m.id === `tela-${messageId}` ? {
          ...m,
          text: answer,
          why: createAnswerWhy({
            id: `tela-${messageId}`,
            question,
            answerContext: 'Sources used: saved history, loaded dispatch feed, operations, unresolved pressure, and calendar events.',
          }),
        } : m)
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
        current.map(m => m.id === `tela-${messageId}` ? {
          ...m,
          text: answer,
          why: createAnswerWhy({
            id: `tela-${messageId}`,
            question,
            answerContext: 'Sources used: loaded dispatch feed, operations, unresolved pressure, and calendar events.',
          }),
        } : m)
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
          ? 'Update saved. It will still be here after refresh.'
          : 'I could not save that update. Please try again.',
        why: createAnswerWhy({
          id: `tela-${messageId}`,
          question,
          answerContext: persisted
            ? 'Sources used: operator-authored update and save result.'
            : 'Sources used: failed save result.',
          persisted,
        }),
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Saved Context</p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#17130F]">Messages</h1>
            </div>
          </div>
          <div className="rounded-full bg-[#F4E9D6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6725]">
            Memory live
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[#5E5348]">
          What was said, why it was said, and what changed because of it.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A825F]">Messages</p>
            <p className="mt-1 text-[18px] font-semibold leading-none text-[#17130F]">{thread.length}</p>
          </div>
          <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A825F]">Files</p>
            <p className="mt-1 text-[18px] font-semibold leading-none text-[#17130F]">{feed.length}</p>
          </div>
          <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A825F]">People</p>
            <p className="mt-1 text-[18px] font-semibold leading-none text-[#17130F]">{autoscan.activeOperators.length}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Messages', 'Files', 'Updates', 'Why It Matters', 'People'].map((source) => (
            <span key={source} className="rounded-full bg-[#EFE8DA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A7351]">
              {source}
            </span>
          ))}
        </div>
      </div>

      <section className="mt-4 rounded-[26px] border border-[#E3D8C7] bg-white/82 p-4 shadow-[0_14px_34px_rgba(17,17,17,0.05)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Memory asks</p>
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
            {message.role === 'tela' && message.why && (
              <div className="mt-3 rounded-[16px] border border-[#E8DCCB] bg-[#FCFAF7] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">Why This Answer Exists</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B5D4B]">{message.why.whyThisExists}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">Sources Used</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B5D4B]">{message.why.evidence.slice(0, 3).join(' / ')}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">Last Updated</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B5D4B]">{message.why.freshness?.lastUpdated ? new Date(message.why.freshness.lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unavailable'}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-[22px] border border-[#E3D8C7] bg-white/70 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Thread presence</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">
          {feed.length} updates / {calendarEvents.length} calendar / {unresolvedItems.length} unresolved
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
