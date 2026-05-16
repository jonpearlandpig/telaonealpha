import type { ContinuityCard as Card } from '@/types/feed'

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function ContinuityCard({ card }: { card: Card }) {
  return <article className='bg-white border border-[var(--border)] rounded-[28px] p-7 space-y-4 shadow-[var(--shadow-soft)]'>
    <div className='flex justify-between items-start gap-3'>
      <div className='flex items-start gap-3'>
        <div className='h-10 w-10 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] grid place-items-center text-xs'>{initials(card.owner)}</div>
        <div>
          <p className='text-xs text-[var(--text-secondary)]'>{card.owner} · {card.department}</p>
          <h3 className='text-xl leading-tight mt-1'>{card.headline}</h3>
        </div>
      </div>
      <p className='text-xs text-[var(--text-tertiary)]'>{card.timestamp}</p>
    </div>
    <p className='text-[15px] text-[var(--text-secondary)]'>{card.summary}</p>
    <div className='flex justify-between text-xs'><span className={card.unresolved || card.pinned ?'text-[var(--gold)]':'text-[var(--text-tertiary)]'}>{card.unresolved ? 'Unresolved' : 'Stable'}</span><span>{card.type}</span></div>
    <div className='grid grid-cols-4 gap-2 text-xs'>{['Acknowledge','Add Note','Resolve','Pin'].map((a)=><button key={a} className='min-h-11 rounded-full border border-[var(--border)]'>{a}</button>)}</div>
  </article>
}
