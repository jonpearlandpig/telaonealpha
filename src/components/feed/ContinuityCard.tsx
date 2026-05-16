import type { ContinuityCard as Card } from '@/types/feed'

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function ContinuityCard({ card }: { card: Card }) {
  const ambient = card.unresolved ? 'Awaiting acknowledgement' : `Updated ${card.timestamp}`

  return <article className='bg-white/95 rounded-[28px] p-6 space-y-4 shadow-[var(--shadow-soft)] border border-[#F0ECE4]'>
    <div className='flex justify-between items-start gap-3'>
      <div className='flex items-start gap-3'>
        <div className={`h-10 w-10 rounded-full border grid place-items-center text-xs ${card.unresolved || card.pinned ? 'border-[#E8D39A] bg-[#FFF8E8]' : 'border-[var(--border)] bg-[var(--bg-soft)]'}`}>{initials(card.owner)}</div>
        <div>
          <p className='text-[11px] text-[var(--text-secondary)]'>{card.owner} · {card.department}</p>
          <h3 className='text-[20px] leading-[1.15] mt-1 tracking-[-0.01em]'>{card.headline}</h3>
        </div>
      </div>
      <p className='text-[11px] text-[var(--text-tertiary)]'>{card.timestamp}</p>
    </div>

    <p className='text-[14px] leading-[1.45] text-[var(--text-secondary)] line-clamp-3'>{card.summary}</p>

    <div className='flex flex-wrap gap-2 text-[10px]'>
      <span className='rounded-full border border-[var(--border)] px-2 py-1 text-[var(--text-secondary)]'>{card.sourceLabel}</span>
      {card.tags.map((tag) => <span key={tag} className='rounded-full bg-[#F5F2EB] px-2 py-1 text-[var(--text-secondary)]'>{tag}</span>)}
      {card.relationship && <span className='rounded-full bg-[#FFF8E8] px-2 py-1 text-[#8A6611]'>{card.relationship}</span>}
    </div>

    <div className='flex justify-between items-center text-[11px]'>
      <span className='inline-flex items-center gap-1.5 text-[var(--text-secondary)]'>
        <span className={`h-1.5 w-1.5 rounded-full ${card.unresolved || card.pinned ? 'bg-[var(--gold)]' : 'bg-[var(--text-tertiary)]/60'}`} />
        {ambient}
      </span>
      <span className={card.unresolved || card.pinned ? 'text-[var(--gold)]' : 'text-[var(--text-tertiary)]'}>{card.type}</span>
    </div>

    <div className='grid grid-cols-4 gap-2 text-[11px]'>
      {['Acknowledge', 'Add Note', 'Resolve', 'Pin'].map((a) => <button key={a} className='min-h-10 rounded-full border border-[var(--border)] bg-white/80 active:translate-y-[1px]'>{a}</button>)}
    </div>
  </article>
}
