import type { ContinuityEvent } from '@/lib/showtela/types'

function pressureTone(item: ContinuityEvent) {
  if (item.pressure === 'high' || item.operationalRisk === 'high') return 'border-[#8E3A3A]/45'
  if (item.pressure === 'medium' || item.operationalRisk === 'medium') return 'border-[#9C7A3D]/45'
  if (item.pressure === 'low' || item.operationalRisk === 'low') return 'border-[#3F6D97]/45'
  return 'border-[#D8C8AE]/70'
}

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  const media = item.image ?? item.attachments?.[0]?.previewUrl
  return (
    <article className={`overflow-hidden rounded-[1.35rem] border bg-[linear-gradient(152deg,#FFFDF7_0%,#F6EBDD_100%)] shadow-[0_18px_34px_rgba(24,19,13,0.11)] ${pressureTone(item)}`}>
      {media
        ? <div className='relative h-[220px] w-full overflow-hidden'><img src={media} alt={item.headline} className='h-full w-full object-cover' /><div className='absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent' /><div className='absolute left-3 top-3 rounded-full border border-white/25 bg-black/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3E2BD]'>{item.tags?.[0] ?? 'CONTINUITY'}</div></div>
        : null}
      <div className='p-4'>
        <h3 className='text-[16px] font-semibold leading-tight text-[#18150F]'>{item.headline}</h3>
        <p className='mt-2 text-sm leading-relaxed text-[#5E5142]'>{item.body}</p>
        <div className='mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#8A7049]'>
          {item.waitingOn ? <span className='rounded-full bg-[#F3E2C7] px-2 py-0.5'>Waiting on {item.waitingOn}</span> : null}
          {item.blockedBy ? <span className='rounded-full bg-[#F1D3D3] px-2 py-0.5 text-[#7A2C2C]'>Blocked</span> : null}
          {(item.unresolvedDependencies?.length ?? 0) > 0 ? <span className='rounded-full bg-[#E7DCC8] px-2 py-0.5'>{item.unresolvedDependencies?.length} dependencies</span> : null}
        </div>
        <p className='mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A7049]'>{item.owner?.name ?? 'Unknown'} • {item.timestamp ?? ''}</p>
      </div>
    </article>
  )
}
