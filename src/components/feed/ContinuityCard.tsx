import type { ContinuityCard as Card } from '@/types/feed'

export function ContinuityCard({ card }: { card: Card }) {
  return <article className='bg-white border border-[var(--border)] rounded-[28px] p-7 space-y-4 shadow-[var(--shadow-soft)]'>
    <div className='flex justify-between items-start'><div><p className='text-xs text-[var(--text-secondary)]'>{card.department} · {card.owner}</p><h3 className='text-xl leading-tight mt-1'>{card.headline}</h3></div><p className='text-xs text-[var(--text-tertiary)]'>{card.timestamp}</p></div>
    <p className='text-[15px] text-[var(--text-secondary)]'>{card.summary}</p>
    <div className='flex justify-between text-xs'><span className={card.unresolved?'text-[var(--gold)]':'text-[var(--text-tertiary)]'}>{card.unresolved ? 'Unresolved' : 'Stable'}</span><span>{card.acknowledged} acknowledged</span></div>
    <div className='grid grid-cols-4 gap-2 text-xs'>{['Acknowledge','Add Note','Assign','Pin'].map((a)=><button key={a} className='min-h-11 rounded-full border border-[var(--border)]'>{a}</button>)}</div>
  </article>
}
