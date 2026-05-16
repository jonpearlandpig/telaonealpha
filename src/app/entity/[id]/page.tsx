import Link from 'next/link'
import { buildEntityRuntimeSurface } from '@/lib/entity/runtime'

export const dynamic = 'force-dynamic'

const STATE_STYLE: Record<string, string> = {
  active: 'text-[#48613B] bg-[#EEF6E8] border-[#DBEBD0]',
  blocked: 'text-[#8A6611] bg-[#FFF8E8] border-[#EED9A6]',
  dormant: 'text-[var(--text-secondary)] bg-white border-[var(--border)]',
  escalating: 'text-[#9A6B00] bg-[#FFF2D6] border-[#E7C67A]',
}

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entity = await buildEntityRuntimeSurface(id)

  return <main className='min-h-screen bg-[var(--bg)] text-[var(--text-primary)]'>
    <div className='mx-auto max-w-[460px] px-5 pb-[120px] pt-6 space-y-6'>
      <Link href='/' className='text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]'>← Back to Feed</Link>

      <section className='bg-white rounded-[30px] border border-[#EFE9DE] shadow-[0_10px_28px_rgba(20,20,20,0.06)] p-5 space-y-3'>
        <p className='text-[11px] text-[var(--text-secondary)]'>Operational Memory Surface</p>
        <h1 className='text-[28px] leading-[1.1]'>{entity.name}</h1>
        <p className='text-[13px] text-[var(--text-secondary)]'>{entity.role}</p>
        <div className='flex items-center gap-2'>
          <span className={`text-[10px] uppercase tracking-[0.1em] rounded-full border px-2.5 py-1 ${STATE_STYLE[entity.state]}`}>{entity.state}</span>
          <span className='text-[11px] text-[var(--text-secondary)]'>{entity.relationship}</span>
        </div>
      </section>

      <section className='space-y-3'>
        <h2 className='text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]'>Continuity Timeline</h2>
        <div className='space-y-3'>
          {entity.timeline.map((item) => <article key={item.id} className='bg-white rounded-[24px] border border-[var(--border)] p-4'>
            <div className='flex justify-between text-[11px] text-[var(--text-secondary)]'><span>{item.owner} · {item.department}</span><span>{item.timestamp}</span></div>
            <p className='text-[16px] leading-[1.25] mt-1'>{item.headline}</p>
            <p className='text-[13px] leading-[1.5] text-[var(--text-secondary)] mt-2'>{item.summary}</p>
          </article>)}
          {entity.timeline.length === 0 && <p className='text-sm text-[var(--text-secondary)]'>No continuity timeline found yet.</p>}
        </div>
      </section>

      <section className='space-y-3'>
        <h2 className='text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]'>Operational Memory</h2>
        <div className='bg-white rounded-[24px] border border-[var(--border)] p-4 space-y-3 text-[13px]'>
          <p><span className='text-[var(--text-secondary)]'>Unresolved Threads:</span> {entity.unresolved.length}</p>
          <p><span className='text-[var(--text-secondary)]'>Linked Decisions:</span> {entity.linkedDecisions.length}</p>
          <p><span className='text-[var(--text-secondary)]'>Linked Projects:</span> {entity.linkedProjects.join(', ') || '—'}</p>
          <p><span className='text-[var(--text-secondary)]'>Linked Entities:</span> {entity.linkedEntities.join(', ') || '—'}</p>
        </div>
      </section>
    </div>
  </main>
}
