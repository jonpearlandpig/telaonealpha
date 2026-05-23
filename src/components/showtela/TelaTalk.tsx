'use client'

import { useMemo, useRef, useState } from 'react'
import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { ContinuityEvent } from '@/lib/showtela/types'
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
}: {
  autoscan: AutoscanSummary
  feed?: ContinuityEvent[]
  operations?: OperationEntity[]
  unresolvedItems?: UnresolvedItem[]
  calendarEvents?: OperationalCalendarEvent[]
}) {
  const promptOptions = [
    'What changed today?',
    'What requires attention?',
    'What shifted operationally?',
    'What unresolved pressure exists?',
  ]
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState<Array<{ id: string; role: 'user' | 'tela'; text: string }>>([
    {
      id: 'tela-pinned',
      role: 'tela',
      text: `${autoscan.currentTruth} ${autoscan.mattersNow} ${autoscan.nextMovement}`,
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

  function deriveTelaAnswer(question: string) {
    const lower = question.toLowerCase()

    if (lower.includes('venue')) {
      const venueEvents = calendarEvents.filter((event) => event.type === 'venue' || event.departments.some((department) => department.toLowerCase().includes('venue')))
      return venueEvents.length
        ? `Venue movement is attached to ${venueEvents[0].title}. ${venueEvents[0].summary ?? venueEvents[0].telaHint ?? 'TELA is holding it as calendar-linked continuity.'}`
        : 'No venue-specific movement is derived from the current continuity field yet.'
    }

    if (lower.includes('changed') || lower.includes('today')) {
      return derivedContext.latestContinuity
        ? `${derivedContext.latestContinuity.headline}${derivedContext.latestContinuity.body ? ` - ${derivedContext.latestContinuity.body}` : ''}`
        : autoscan.mattersNow
    }

    if (lower.includes('attention') || lower.includes('requires')) {
      return derivedContext.priorityOperation
        ? `${derivedContext.priorityOperation.label} requires attention first. It is carrying ${derivedContext.priorityOperation.unresolvedCount ?? 0} unresolved signal${derivedContext.priorityOperation.unresolvedCount === 1 ? '' : 's'}.`
        : autoscan.nextMovement
    }

    if (lower.includes('shift')) {
      return derivedContext.pressureEvents[0]
        ? `${derivedContext.pressureEvents[0].title} is the clearest operational shift. Pressure is ${derivedContext.pressureEvents[0].pressureState}; continuity is ${derivedContext.pressureEvents[0].continuityState}.`
        : 'No pressure shift is derived beyond the current autoscan.'
    }

    if (lower.includes('unresolved') || lower.includes('pressure')) {
      return derivedContext.unresolvedCount > 0
        ? `${derivedContext.unresolvedCount} unresolved item${derivedContext.unresolvedCount === 1 ? '' : 's'} remain visible; ${derivedContext.blockedCount} are blocker-level.`
        : 'No unresolved pressure is currently derived from ShowTELA continuity.'
    }

    return `${autoscan.currentTruth} ${autoscan.nextMovement}`
  }

  function submitQuestion(value: string) {
    const question = value.trim()
    if (!question) return
    messageCounter.current += 1
    const messageId = messageCounter.current
    setThread((current) => [
      ...current,
      { id: `user-${messageId}`, role: 'user', text: question },
      { id: `tela-${messageId}`, role: 'tela', text: deriveTelaAnswer(question) },
    ])
    setDraft('')
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] px-5 pb-32 pt-14">
      <div className="rounded-[26px] border border-[#2A231A] bg-[#17130F] p-4 text-[#F5EEDC] shadow-[0_18px_38px_rgba(20,18,16,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D7BC7F]">TELA</p>
            <h1 className="mt-1.5 text-[23px] font-semibold tracking-[-0.04em]">Persistent thread</h1>
          </div>
          <div className="rounded-full border border-[#5A4725] bg-[#221B13] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#DABD79]">
            Pinned
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[#DDD1BB]">
          Ask from continuity memory, CST calendar movement, unresolved pressure, operational feed, and constitutional event spine readiness.
        </p>
      </div>

      <section className="mt-4 rounded-[24px] border border-[#E3D8C7] bg-white/82 p-4 shadow-[0_14px_34px_rgba(17,17,17,0.05)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Ask TELA</p>
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
            className={`rounded-[22px] px-4 py-3 shadow-[0_10px_26px_rgba(17,17,17,0.04)] ${
              message.role === 'tela'
                ? 'border border-[#E3D8C7] bg-[#FFFDF8] text-[#171411]'
                : 'ml-8 bg-[#17130F] text-[#F7E8C2]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${message.role === 'tela' ? 'text-[#8A7351]' : 'text-[#D7BC7F]'}`}>
                {message.role === 'tela' ? 'TELA' : 'You'}
              </p>
              {index === 0 && (
                <span className="rounded-full bg-[#F1E6D4] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#7D6132]">
                  Pinned
                </span>
              )}
            </div>
            <p className={`mt-1 text-[13px] leading-relaxed ${message.role === 'tela' ? 'text-[#5E5348]' : 'text-[#F2E6CE]'}`}>{message.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-[20px] border border-[#E3D8C7] bg-white/70 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Runtime Sources</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">
          {feed.length} continuity / {calendarEvents.length} calendar / {unresolvedItems.length} unresolved / constitutional spine ready
        </p>
        {autoscan.activeOperators.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {autoscan.activeOperators.map((name) => (
              <span key={name} className="rounded-full bg-[#F5F0E6] px-2.5 py-1 text-[11px] font-medium text-[#5E5348]">
                {name}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
