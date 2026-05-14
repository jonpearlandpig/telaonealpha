'use client'

import { useEffect, useMemo, useState } from 'react'
import { StatusDot } from './StatusDot'
import { PearlBoxCapture } from './PearlBoxCapture'
import type { SyncPayload } from '@/lib/notion'
import { ArtifactLibrary } from './artifacts/ArtifactLibrary'
import { ContinuityMap } from './artifacts/ContinuityMap'
import { EntityPanel } from './entities/EntityPanel'
import { buildArtifactGraph } from '@/lib/artifacts/artifactGraph'
import { loadArtifacts, togglePinArtifact, type ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { loadEntities } from '@/lib/entities/entityStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'

type PearlItem = {
  id: string
  content: string
  source: string
  createdAt: string
}

type Props = {
  data: SyncPayload | null
  pearlItems: PearlItem[]
  onCapturePearl: (content: string) => Promise<void>
  onRefreshPearl: () => void
  pearlLoading: boolean
  syncing: boolean
}

const STATUS_LABELS: Record<string, string> = {
  active:  'Active',
  warm:    'Warm',
  pending: 'Pending',
  paused:  'Paused',
}

const THIS_WEEK_PLACEHOLDER = [
  { day: 'Mon', event: 'Juan Otero call', time: '10:00A' },
  { day: 'Tue', event: 'Follow-up John Bowers', time: '' },
  { day: 'Wed', event: 'Tim Womble creative review', time: '2:00P' },
  { day: 'Thu', event: 'Operator check-in', time: '' },
  { day: 'Fri', event: 'Weekly review', time: '9:00A' },
]

function ConversionActCard({ act }: { act: SyncPayload['conversionActs'][0] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="tela-card"
      style={{ padding: '12px 14px', cursor: 'pointer' }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusDot status={act.status} size={8} />
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 500, color: '#EAE0D2', flex: 1 }}>
          {act.name}
        </span>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: act.status === 'active' ? '#ef4444' : act.status === 'warm' ? '#C4973A' : 'rgba(234,224,210,0.3)',
        }}>
          {STATUS_LABELS[act.status]}
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(234,224,210,0.6)', marginTop: 6, lineHeight: 1.4, paddingLeft: 18 }}>
        {act.oneLineStatus}
      </p>

      {act.nextAction && (
        <p style={{ fontSize: 11, color: '#C4973A', marginTop: 4, paddingLeft: 18, fontFamily: "'DM Mono', monospace" }}>
          → {act.nextAction}
        </p>
      )}

      {expanded && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(234,224,210,0.08)',
          paddingLeft: 18,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(234,224,210,0.5)', lineHeight: 1.6 }}>{act.oneLineStatus}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {['Advance', 'Pause', 'Remove'].map((action) => (
              <button
                key={action}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'none',
                  border: '1px solid rgba(234,224,210,0.15)',
                  color: action === 'Advance' ? '#C4973A' : 'rgba(234,224,210,0.35)',
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: 10,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span style={{
      display: 'block',
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 11,
      fontWeight: 400,
      color: 'rgba(234,224,210,0.3)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      marginBottom: 10,
    }}>
      {children}
    </span>
  )
}

export function ContinuityPanel({ data, pearlItems, onCapturePearl, onRefreshPearl, pearlLoading, syncing }: Props) {
  const acts = useMemo(() => data?.conversionActs ?? [], [data])
  const alsoInMotion = data?.alsoInMotion ?? []
  const thisWeek = data?.thisWeek?.length ? data.thisWeek : THIS_WEEK_PLACEHOLDER
  const waitingOn = data?.waitingOn ?? []

  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>(() => loadArtifacts())
  const [entities, setEntities] = useState<EntityRecord[]>(() => loadEntities())
  const [focusedEntityId, setFocusedEntityId] = useState<string | undefined>(undefined)


  useEffect(() => {
    const refresh = () => { setArtifacts(loadArtifacts()); setEntities(loadEntities()) }
    window.addEventListener('tela-artifacts-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('tela-artifacts-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const seededArtifacts = useMemo(() => {
    if (artifacts.length > 0) return artifacts
    return acts.slice(0, 4).map((act, idx) => ({
      id: `seed-${idx}`,
      title: `${act.name} continuity artifact`,
      threadId: 'continuity',
      sessionId: 'runtime-v1',
      prompt: act.nextAction,
      structure: `status: ${act.status}`,
      entities: [act.name],
      projects: ['telaone'],
      lineageId: `lineage-${idx % 2}`,
      createdAt: `2026-01-01T00:0${idx}:00.000Z`,
      pinned: idx === 0,
    }))
  }, [acts, artifacts])

  const graph = useMemo(() => buildArtifactGraph(seededArtifacts), [seededArtifacts])

  return (
    <div className="continuity-grid">

      {/* Column 1: Conversion Acts */}
      <div className="continuity-col" style={{ background: '#0D1B2A', padding: '28px 24px', overflowY: 'auto' }}>
        <SectionLabel>What Is Real Right Now</SectionLabel>

        {syncing && acts.length === 0 ? (
          <div style={{ color: 'rgba(234,224,210,0.2)', fontSize: 12, fontStyle: 'italic' }}>Loading…</div>
        ) : acts.length === 0 ? (
          <div>
            {/* Placeholder skeleton when no data yet */}
            {['Tim Womble', 'Juan Otero', 'John Bowers'].map((name, i) => (
              <div key={name} className="tela-card" style={{ padding: '12px 14px', marginBottom: 8, opacity: 0.4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusDot status={i === 0 ? 'active' : i === 1 ? 'warm' : 'pending'} size={8} />
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 500, color: '#EAE0D2' }}>
                    {name}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(234,224,210,0.4)', marginTop: 6, paddingLeft: 18 }}>
                  Sync to load status
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {acts.map((act) => (
              <ConversionActCard key={act.name} act={act} />
            ))}
          </div>
        )}

        {waitingOn.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <SectionLabel>Waiting On</SectionLabel>
            {waitingOn.map((w, i) => (
              <div key={i} style={{ paddingBottom: 8, borderBottom: '1px solid rgba(234,224,210,0.06)', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#EAE0D2' }}>{w.item}</span>
                <span style={{ fontSize: 11, color: 'rgba(234,224,210,0.4)', marginLeft: 8 }}>← {w.who}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Column 2: Also In Motion + This Week */}
      <div className="continuity-col" style={{ background: '#0D1B2A', padding: '28px 24px', overflowY: 'auto', borderLeft: '1px solid rgba(234,224,210,0.04)', borderRight: '1px solid rgba(234,224,210,0.04)' }}>
        <SectionLabel>Also In Motion</SectionLabel>

        {alsoInMotion.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(234,224,210,0.2)', fontStyle: 'italic', marginBottom: 24 }}>
            Sync to load contacts
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {alsoInMotion.map((c, i) => (
              <div key={i} className="tela-card" style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <StatusDot status="warm" size={6} />
                <div>
                  <span style={{ fontSize: 13, color: '#EAE0D2' }}>{c.name}</span>
                  <p style={{ fontSize: 11, color: 'rgba(234,224,210,0.4)', marginTop: 2 }}>{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}


        <div style={{ marginTop: 24 }}>
          <SectionLabel>Cinematic Continuity Map · Operational Overlay</SectionLabel>
          <ContinuityMap graph={graph} entities={entities} focusedEntityId={focusedEntityId} />
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionLabel>Artifact Library · Preview First</SectionLabel>
          <ArtifactLibrary artifacts={seededArtifacts} onTogglePin={(id) => setArtifacts(togglePinArtifact(id))} onContinue={(id) => window.dispatchEvent(new CustomEvent('tela-artifact-continue', { detail: { artifactId: id } }))} />
          <EntityPanel entities={entities} onFocus={setFocusedEntityId} />
        </div>

        <SectionLabel>This Week</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {thisWeek.map((ev, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(234,224,210,0.06)',
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#C4973A', minWidth: 28, letterSpacing: '0.05em' }}>
                {ev.day}
              </span>
              <span style={{ fontSize: 12, color: '#EAE0D2', flex: 1 }}>{ev.event}</span>
              {ev.time && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(234,224,210,0.3)' }}>
                  {ev.time}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Pearl Box */}
      <div className="continuity-col" style={{ background: '#0D1B2A', padding: '28px 24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <PearlBoxCapture
          items={pearlItems}
          onCapture={onCapturePearl}
          onRefresh={onRefreshPearl}
          loading={pearlLoading}
        />
      </div>
    </div>
  )
}
