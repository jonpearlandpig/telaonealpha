'use client'

import type { TELAwhy } from '@/lib/showtela/types'

function formatDateTime(value?: string) {
  if (!value) return 'Unavailable'
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return 'Unavailable'
  }
}

function statusLabel(status: TELAwhy['status']) {
  if (status === 'verified') return 'Source verified'
  if (status === 'low-provenance') return 'Source unclear'
  return 'Needs more context'
}

function statusClass(status: TELAwhy['status']) {
  if (status === 'verified') return 'border-[#D7C394] bg-[#FBF5E7] text-[#6F541A]'
  if (status === 'low-provenance') return 'border-[#E0B56F] bg-[#FFF7E8] text-[#7A4F09]'
  return 'border-[#DF9A8F] bg-[#FFF0ED] text-[#8B2D1F]'
}

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-[16px] border border-[#EDE5DA] bg-[#FCFAF6] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.slice(0, 6).map((item) => (
            <li key={item} className="text-[12px] leading-relaxed text-[#5E5348]">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-[#8B847B]">{empty}</p>
      )}
    </div>
  )
}

export function TELAwhyCard({ why }: { why: TELAwhy }) {
  const lineageItems = why.lineage.length > 0 ? why.lineage : ['No source path attached yet']

  return (
    <article className="space-y-3">
      <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass(why.status)}`}>
        {statusLabel(why.status)}
      </div>

      <section className="rounded-[18px] border border-[#E3D8C7] bg-white px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Why This Matters</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#171411]">{why.whyThisExists}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-[#EDE5DA] bg-[#FCFAF6] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">Source File</p>
          <p className="mt-2 text-[13px] font-semibold text-[#171411]">{why.sourceArtifact?.title ?? 'Unavailable'}</p>
          {why.sourceArtifact?.id && <p className="mt-1 text-[11px] text-[#8B847B]">{why.sourceArtifact.id}</p>}
        </div>
        <div className="rounded-[16px] border border-[#EDE5DA] bg-[#FCFAF6] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">Added</p>
          <p className="mt-2 text-[13px] font-semibold text-[#171411]">{formatDateTime(why.importTimestamp)}</p>
          <p className="mt-1 text-[11px] text-[#8B847B]">Author: {why.author ?? 'Unavailable'}</p>
        </div>
      </section>

      <ListBlock title="Sources Used" items={why.evidence} empty="No sources are attached." />

      <ListBlock
        title="Internal IDs"
        items={[
          why.evidenceRefs?.eventId ? `Event ID: ${why.evidenceRefs.eventId}` : '',
          why.evidenceRefs?.continuityRecordId ? `Saved Update ID: ${why.evidenceRefs.continuityRecordId}` : '',
          why.evidenceRefs?.artifactId ? `Source File ID: ${why.evidenceRefs.artifactId}` : '',
        ].filter(Boolean)}
        empty="No internal identifiers are attached."
      />

      <section className="grid gap-3">
        <ListBlock title="Linked People" items={why.linkedEntities} empty="No linked people attached." />
        <ListBlock title="Linked Operations" items={why.linkedOperations} empty="No linked operations attached." />
        <ListBlock title="Linked Calendar Events" items={why.linkedCalendarEvents} empty="No linked calendar events attached." />
      </section>

      <ListBlock title="Source Path" items={lineageItems} empty="No source path is attached." />

      <section className="rounded-[16px] border border-[#EDE5DA] bg-[#FCFAF6] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">Last Checked</p>
        <p className="mt-2 text-[13px] font-semibold text-[#171411]">{formatDateTime(why.freshness?.lastUpdated)}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#8B847B]">{why.freshness?.label ?? 'No freshness signal available.'}</p>
      </section>

      {why.continuityEvent && (
        <section className="rounded-[16px] border border-[#EDE5DA] bg-[#171411] px-4 py-3 text-[#F7E8C2]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Saved Update</p>
          <p className="mt-2 text-[13px] font-semibold">{why.continuityEvent.type}</p>
          <p className="mt-1 text-[11px] text-[#D8CCB8]">{why.continuityEvent.id} / {formatDateTime(why.continuityEvent.timestamp)}</p>
        </section>
      )}
    </article>
  )
}
