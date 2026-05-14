'use client'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export function EntityPanel({ entities, onFocus }: { entities: EntityRecord[]; onFocus: (id: string) => void }) {
  return <div style={{ marginTop: 24 }}>
    <div style={{ color: 'rgba(234,224,210,0.35)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Entity Continuity</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entities.slice(0, 10).map((e) => <button key={e.id} onClick={() => onFocus(e.id)} style={{ textAlign: 'left', background: 'rgba(8,19,33,0.72)', border: '1px solid rgba(196,151,58,0.2)', borderRadius: 10, padding: 10, color: '#EAE0D2' }}>
        <div style={{ fontSize: 13 }}>{e.name}</div>
        <div style={{ fontSize: 10, color: 'rgba(234,224,210,0.55)' }}>{e.type} · continuity {e.continuityCount}</div>
      </button>)}
    </div>
  </div>
}
