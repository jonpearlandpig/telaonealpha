import type { ContinuityCard as Card } from '@/types/feed'

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function ContinuityCard({ card }: { card: Card }) {
  const ambient = card.unresolved ? 'Unresolved · needs acknowledgement' : `Updated ${card.timestamp}`

  return <article className='bg-white rounded-[28px] px-5 py-5 space-y-4 border border-[#EFE9DE] shadow-[0_6px_20px_rgba(20,20,20,0.05)]'>
    <div className='flex justify-between items-start gap-3'>
      <div className='flex items-start gap-3 min-w-0'>
        <div className={`h-10 w-10 shrink-0 rounded-full border grid place-items-center text-[11px] font-medium ${card.unresolved || card.pinned ? 'border-[#DFC17A] bg-[#FFF8E8] text-[#7E5B0F]' : 'border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-secondary)]'}`}>{initials(card.owner)}</div>
        <div className='min-w-0'>
          <p className='text-[11px] leading-4 text-[var(--text-secondary)] truncate'>{card.owner} · {card.department}</p>
          <h3 className='text-[18px] leading-[1.24] mt-1 tracking-[-0.01em] text-[var(--text-primary)]'>{card.headline}</h3>
        </div>
      </div>
      <p className='text-[10px] leading-4 text-[var(--text-tertiary)] shrink-0'>{card.timestamp}</p>
    </div>

    <p className='text-[14px] leading-[1.52] text-[var(--text-secondary)] line-clamp-3'>{card.summary}</p>

    <div className='flex flex-wrap gap-1.5 text-[10px] leading-4'>
      <span className='rounded-full border border-[var(--border)] px-2.5 py-1 text-[var(--text-secondary)] bg-white'>{card.sourceLabel}</span>
      {card.tags.slice(0, 1).map((tag) => <span key={tag} className='rounded-full bg-[#F5F1E8] px-2.5 py-1 text-[var(--text-secondary)]'>{tag}</span>)}
      {card.relationship && <span className='rounded-full bg-[#FBF5E7] px-2.5 py-1 text-[#866114] truncate max-w-[150px]'>{card.relationship}</span>}
    </div>

    <div className='flex justify-between items-center text-[11px]'>
      <span className='inline-flex items-center gap-1.5 text-[var(--text-secondary)]'>
        <span className={`h-1.5 w-1.5 rounded-full ${card.unresolved || card.pinned ? 'bg-[var(--gold)]' : 'bg-[var(--text-tertiary)]/60'}`} />
        {ambient}
      </span>
      <span className={`text-[10px] tracking-[0.1em] uppercase ${card.unresolved || card.pinned ? 'text-[var(--gold)]' : 'text-[var(--text-tertiary)]'}`}>{card.type}</span>
    </div>

    <div className='grid grid-cols-4 gap-2 pt-0.5 text-[11px]'>
      {['Acknowledge', 'Add Note', 'Resolve', 'Pin'].map((a) => <button key={a} className='min-h-9 rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] active:translate-y-[1px]'>{a}</button>)}
    </div>
  </article>
}
