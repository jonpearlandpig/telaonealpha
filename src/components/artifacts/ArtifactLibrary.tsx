'use client'
import { useMemo } from 'react'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { ArtifactCard } from './ArtifactCard'

export function ArtifactLibrary({ artifacts, onTogglePin, onContinue }: { artifacts: ArtifactRecord[]; onTogglePin: (id: string) => void; onContinue: (id: string) => void }) {
  const grouped = useMemo(() => artifacts.reduce<Record<string, ArtifactRecord[]>>((acc, a) => { const k = `${a.threadId}/${a.sessionId}`; (acc[k] ||= []).push(a); return acc }, {}), [artifacts])
  const keys = Object.keys(grouped)
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {keys.length === 0 && <div style={{ color: 'rgba(234,224,210,0.5)', fontSize: 12 }}>No artifacts captured yet.</div>}
    {keys.map((k) => <section key={k} style={{ border: '1px solid rgba(196,151,58,0.2)', borderRadius: 12, padding: 10, background: 'linear-gradient(145deg, rgba(13,27,42,0.95), rgba(8,19,33,0.9))' }}>
      <div style={{ color: '#C4973A', fontSize: 10, marginBottom: 8 }}>{k}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{grouped[k].sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map((a) => <ArtifactCard key={a.id} artifact={a} onTogglePin={onTogglePin} onContinue={onContinue} />)}</div>
    </section>)}
  </div>
}
