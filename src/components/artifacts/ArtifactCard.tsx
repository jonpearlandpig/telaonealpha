'use client'
import { useMemo, useState } from 'react'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { ArtifactRenderer } from './ArtifactRenderer'

const tabs = ['Preview', 'Open', 'Structure', 'View Source', 'Download'] as const
export function ArtifactCard({ artifact, onTogglePin, onContinue }: { artifact: ArtifactRecord; onTogglePin: (id: string) => void; onContinue: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<(typeof tabs)[number]>('Preview')
  const [startX, setStartX] = useState<number | null>(null)
  const downloadHref = useMemo(() => {
    if (artifact.previewUrl) return artifact.previewUrl
    const materialized = artifact.html ?? artifact.markdown ?? artifact.code ?? artifact.text
    if (!materialized) return '#'
    const blob = new Blob([materialized], { type: artifact.mimeType || 'text/plain' })
    return URL.createObjectURL(blob)
  }, [artifact])

  return <>
    <button onClick={() => setOpen(true)} style={{ width: '100%', textAlign: 'left', background: 'rgba(8,19,33,0.75)', border: '1px solid rgba(234,224,210,0.08)', borderRadius: 12, padding: 12, color: '#EAE0D2' }}>
      <div style={{ fontSize: 14 }}>{artifact.pinned ? '★ ' : ''}{artifact.title}</div>
      <div style={{ fontSize: 10, color: 'rgba(234,224,210,0.6)' }}>{artifact.threadId} · {new Date(artifact.createdAt).toLocaleString()}</div>
    </button>
    {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(3,8,16,0.76)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => setStartX(e.touches[0].clientX)} onTouchEnd={(e) => { if (startX == null) return; const dx = e.changedTouches[0].clientX - startX; const idx = tabs.indexOf(tab); if (dx < -40 && idx < tabs.length - 1) setTab(tabs[idx + 1]); if (dx > 40 && idx > 0) setTab(tabs[idx - 1]); }} style={{ width: '100%', maxHeight: '88vh', background: '#0D1B2A', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={() => onTogglePin(artifact.id)} style={{ color: '#C4973A', background: 'none', border: 0 }}>{artifact.pinned ? 'Unpin' : 'Pin'}</button>
          <button onClick={() => onContinue(artifact.id)} style={{ color: '#EAE0D2', background: 'none', border: 0 }}>Continue</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>{tabs.map((t) => <button key={t} onClick={() => setTab(t)} style={{ fontSize: 11, border: '1px solid rgba(196,151,58,0.32)', background: t === tab ? 'rgba(196,151,58,0.18)' : 'transparent', color: '#EAE0D2', borderRadius: 999, padding: '4px 10px' }}>{t}</button>)}</div>
        {tab === 'Preview' && <ArtifactRenderer artifact={artifact} />}
        {tab === 'Structure' && <pre style={{ color: '#EAE0D2', whiteSpace: 'pre-wrap' }}>{artifact.structure || 'No structure.'}</pre>}
        {tab === 'Open' && <a href={downloadHref} target="_blank" rel="noreferrer" style={{ color: '#EAE0D2' }}>Open Artifact</a>}
        {tab === 'View Source' && <pre style={{ color: '#C4973A', whiteSpace: 'pre-wrap' }}>{artifact.code || artifact.html || artifact.markdown || artifact.text || 'No source captured.'}</pre>}
        {tab === 'Download' && <a href={downloadHref} download={artifact.fileName || `${artifact.id}.txt`} style={{ color: '#EAE0D2' }}>Download Generated File</a>}
      </div>
    </div>}
  </>
}
