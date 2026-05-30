import Link from 'next/link'
import { notFound } from 'next/navigation'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { getSession } from '@/lib/auth'
import type { ContinuityEvent, PressureLevel } from '@/lib/showtela/types'

export const dynamic = 'force-dynamic'

const PRESSURE_COLOR: Record<PressureLevel, string> = {
  low: '#4ADE80',
  medium: '#F59E0B',
  high: '#F87171',
  critical: '#EF4444',
}

const SURFACE_LABEL: Record<string, string> = {
  telegram: 'Telegram',
  voice: 'Voice',
  ingest: 'Ingest',
  runtime: 'Runtime',
  notion: 'Notion',
  api: 'API',
}

function formatDate(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

function formatShortDate(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">{label}</h2>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  )
}

function EntityChip({ name }: { name: string }) {
  return (
    <span className="rounded-full bg-[#EAE4DA] px-3 py-1 text-[11px] font-medium text-[#5E5348]">
      {name}
    </span>
  )
}

function EventDetail({ event }: { event: ContinuityEvent }) {
  const pressureColor = event.pressure ? PRESSURE_COLOR[event.pressure] : undefined
  const surface = event.authorshipTrace?.surface
  const classification = event.classification
  const nextActions = event.nextActions ?? []
  const linkedEntities = event.linkedEntities ?? []
  const unresolvedDeps = event.unresolvedDependencies ?? []
  const tags = event.tags ?? []
  const co = event.continuityObject
  const lineage = event.lineageRef

  return (
    <div className="flex flex-col gap-5 px-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="flex-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#141210]">
          {event.headline}
        </h1>
        {event.pressure && (
          <span
            className="mt-0.5 flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: `${pressureColor}22`, color: pressureColor }}
          >
            {event.pressure.charAt(0).toUpperCase() + event.pressure.slice(1)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {event.timestamp && (
          <p className="text-[12px] font-medium text-[#C89B2F]">{formatDate(event.timestamp)}</p>
        )}
        {event.owner?.name && (
          <p className="text-[12px] text-[#8B847B]">· {event.owner.name}{event.owner.role ? `, ${event.owner.role}` : ''}</p>
        )}
        {surface && (
          <span className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">
            {SURFACE_LABEL[surface] ?? surface}
          </span>
        )}
        {classification && (
          <span className="rounded-full bg-[#F0EBE1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8B847B]">
            {classification}
          </span>
        )}
      </div>

      {/* Body */}
      {(event.body || event.summary) && (
        <Section label="Details">
          <Card>
            <p className="text-[14px] leading-relaxed text-[#141210]">
              {event.body || event.summary}
            </p>
          </Card>
        </Section>
      )}

      {/* Raw transcript */}
      {event.rawTranscript && event.rawTranscript !== event.body && (
        <Section label="Transcript">
          <Card>
            <p className="text-[13px] leading-relaxed text-[#5E5348]">{event.rawTranscript}</p>
          </Card>
        </Section>
      )}

      {/* Next actions */}
      {nextActions.length > 0 && (
        <Section label="Next Actions">
          <div className="flex flex-col gap-2">
            {nextActions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-[#C89B2F]" />
                <p className="text-[13px] text-[#141210]">{action}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Blocking / waiting */}
      {(event.blockedBy || event.waitingOn) && (
        <Section label="Blockers">
          <div className="flex flex-col gap-2">
            {event.blockedBy && (
              <Card>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#F87171]" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F87171]">Blocked by</p>
                    <p className="text-[13px] text-[#141210]">{event.blockedBy}</p>
                  </div>
                </div>
              </Card>
            )}
            {event.waitingOn && (
              <Card>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#F59E0B]" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F59E0B]">Waiting on</p>
                    <p className="text-[13px] text-[#141210]">{event.waitingOn}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Section>
      )}

      {/* Unresolved dependencies */}
      {unresolvedDeps.length > 0 && (
        <Section label="Unresolved">
          <div className="flex flex-col gap-2">
            {unresolvedDeps.map((dep) => (
              <div key={dep} className="flex items-start gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F87171]" />
                <p className="text-[13px] text-[#141210]">{dep}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Continuity object */}
      {co && (
        <Section label="Continuity Object">
          <Card>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-[#141210]">{co.title}</p>
                <span className="flex-shrink-0 rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">
                  {co.kind}
                </span>
              </div>
              {co.summary && (
                <p className="text-[13px] leading-relaxed text-[#5E5348]">{co.summary}</p>
              )}
              <div className="mt-1 flex flex-col gap-1 border-t border-[#F0EBE1] pt-2">
                {co.provenance.who && (
                  <p className="text-[11px] text-[#8B847B]">Who: {co.provenance.who}</p>
                )}
                <p className="text-[11px] text-[#8B847B]">What: {co.provenance.what}</p>
                <p className="text-[11px] text-[#8B847B]">When: {co.provenance.when}</p>
                {co.provenance.linkedOperation && (
                  <p className="text-[11px] text-[#8B847B]">Operation: {co.provenance.linkedOperation}</p>
                )}
                {co.provenance.linkedEntity && (
                  <p className="text-[11px] text-[#8B847B]">Entity: {co.provenance.linkedEntity}</p>
                )}
              </div>
            </div>
          </Card>
        </Section>
      )}

      {/* Linked entities */}
      {linkedEntities.length > 0 && (
        <Section label="Linked">
          <div className="flex flex-wrap gap-2">
            {linkedEntities.map((name) => (
              <EntityChip key={name} name={name} />
            ))}
          </div>
        </Section>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <Section label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]"
              >
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Lineage */}
      {lineage && (
        <Section label="Lineage">
          <Card>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8B847B]">Lineage ID</p>
                <p className="font-mono text-[10px] text-[#8B847B]">{lineage.lineageId.slice(0, 16)}…</p>
              </div>
              {lineage.parentId && (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#8B847B]">Parent</p>
                  <p className="font-mono text-[10px] text-[#8B847B]">{lineage.parentId.slice(0, 16)}…</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#8B847B]">Captured</p>
                <p className="text-[11px] text-[#8B847B]">{formatShortDate(lineage.capturedAt)}</p>
              </div>
              {lineage.chain.length > 0 && (
                <div className="mt-1 border-t border-[#F0EBE1] pt-1">
                  <p className="text-[11px] text-[#8B847B]">Chain: {lineage.chain.length} step{lineage.chain.length !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          </Card>
        </Section>
      )}

      {/* Entity ID */}
      <div className="border-t border-[#EAE4DA] pt-2">
        <p className="font-mono text-[10px] text-[#C4BAB0]">{event.id}</p>
      </div>
    </div>
  )
}

export default async function ShowTelaEntityDetailPage({
  params,
}: {
  params: Promise<{ showTelaId: string }>
}) {
  const { showTelaId } = await params

  const [state] = await Promise.all([
    hydrateRuntime(SHOWTELA_WORKSPACE_ID),
    getSession(),
  ])

  const event = state.continuityFeed.find((e: ContinuityEvent) => e.id === showTelaId)

  if (!event) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2]">
      <div className="mx-auto max-w-[430px] md:max-w-[680px] xl:max-w-[760px]">
        {/* Nav bar */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-6">
          <Link
            href="/showtela"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            aria-label="Back to ShowTELA"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 13L7 9L11 5" stroke="#5E5348" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="text-[12px] font-medium text-[#8B847B]">ShowTELA</p>
        </div>

        <EventDetail event={event} />
      </div>
    </div>
  )
}
