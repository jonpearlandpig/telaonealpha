'use client'
import { useMemo, useState } from 'react'
import type { ArtifactGraph } from '@/lib/artifacts/artifactGraph'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export function ContinuityMap({ graph, entities = [], focusedEntityId }: { graph: ArtifactGraph; entities?: EntityRecord[]; focusedEntityId?: string }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const points = useMemo(() => graph.nodes.map((n, i) => ({ id: n.id, title: n.title, x: 50 + (i % 3) * 120, y: 40 + Math.floor(i / 3) * 90 })), [graph.nodes])

  return <div style={{ border: '1px solid rgba(196,151,58,0.22)', borderRadius: 12, overflow: 'hidden', background: 'radial-gradient(circle at 30% 20%, rgba(196,151,58,0.12), transparent 50%), #081321' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, color: '#EAE0D2', fontSize: 11 }}>
      <span>Continuity Map</span>
      <div><button onClick={() => setScale((s) => Math.max(0.8, s - 0.1))}>-</button><button onClick={() => setScale((s) => Math.min(1.8, s + 0.1))}>+</button></div>
    </div>
    <svg viewBox={`0 0 ${420 / scale} ${260 / scale}`} style={{ width: '100%', height: 260, transform: `translate(${offset.x}px,${offset.y}px)` }} onTouchMove={(e) => { const t = e.touches[0]; setOffset({ x: t.clientX % 20, y: t.clientY % 20 }) }}>
      {graph.edges.map((e) => { const a = points.find((p) => p.id === e.from); const b = points.find((p) => p.id === e.to); if (!a || !b) return null; return <line key={`${e.from}-${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(196,151,58,0.62)" strokeWidth={Math.min(3.2, e.weight)} /> })}
      {points.map((p) => <g key={p.id}><circle cx={p.x} cy={p.y} r={13} fill="#0D1B2A" stroke="#C4973A" /><text x={p.x + 16} y={p.y + 4} fill="#EAE0D2" fontSize="9">{p.title.slice(0, 18)}</text></g>)}
      {entities.slice(0, 8).map((e, i) => <g key={e.id}><circle cx={30 + i * 45} cy={236} r={focusedEntityId === e.id ? 8 : 6} fill={focusedEntityId === e.id ? '#C4973A' : 'rgba(234,224,210,0.7)'} /><text x={39 + i * 45} y={239} fill="#EAE0D2" fontSize="8">{e.name.slice(0, 7)}</text></g>)}
    </svg>
  </div>
}
