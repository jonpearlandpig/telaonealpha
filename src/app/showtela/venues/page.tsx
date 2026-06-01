import Link from 'next/link'
import { VenueUploadPanel } from '@/components/showtela/VenueUploadPanel'
import { resolveShowTela } from '@/lib/showtela/lifecycle'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { loadVenueDashboard } from '@/lib/venue-intelligence/store'

export const dynamic = 'force-dynamic'

function tone(score: number) {
  if (score >= 80) return 'bg-[#E9F4E5] text-[#29401F] border-[#D1E5C7]'
  if (score >= 60) return 'bg-[#F8F0DE] text-[#6A4F18] border-[#E6D4A7]'
  return 'bg-[#F6E4DE] text-[#7D3425] border-[#E3B7AA]'
}

function reportLabel(status: 'ready' | 'watch' | 'risk') {
  if (status === 'ready') return 'Ready'
  if (status === 'watch') return 'Watch'
  return 'Risk'
}

export default async function VenueDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const workspaceParam = Array.isArray(params.workspace) ? params.workspace[0] : params.workspace
  const showTelaParam = Array.isArray(params.showtela) ? params.showtela[0] : params.showtela
  const showTela = showTelaParam?.trim() ? await resolveShowTela(showTelaParam.trim()) : null
  const workspaceId = workspaceParam?.trim() || showTela?.workspaceId || SHOWTELA_WORKSPACE_ID
  const { rider, venues, assessments } = await loadVenueDashboard(workspaceId)
  const venueById = new Map(venues.map((venue) => [venue.id, venue]))

  return (
    <main className="min-h-screen bg-[#F7F3EC] px-5 py-8 text-[#171411] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7C46]">Venue Dashboard</p>
            <h1 className="mt-2 text-[40px] font-semibold tracking-[-0.04em]">Venue Intelligence</h1>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.7] text-[#6E6A63]">
              Upload venue packets, normalize them into venue entities, compare them against the active production rider, and keep the resulting readiness inside Supabase.
            </p>
          </div>
          <Link
            href={showTela?.showTelaId
              ? `/showtela?showtela=${encodeURIComponent(showTela.showTelaId)}`
              : `/showtela?workspace=${encodeURIComponent(workspaceId)}`}
            className="rounded-full border border-[#D9CDB8] bg-white px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5B5145]"
          >
            Back To Runtime
          </Link>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_1.6fr]">
          <VenueUploadPanel workspaceId={workspaceId} />

          <section className="rounded-[30px] border border-[#DED4C4] bg-white p-6 shadow-[0_18px_40px_rgba(17,17,17,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Active Rider</p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#171411]">{rider.title}</h2>
            <p className="mt-3 text-[14px] leading-[1.65] text-[#6E6A63]">
              {rider.requirements.length} normalized requirements across {rider.departments.length} departments.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {rider.departments.map((department) => (
                <span
                  key={department}
                  className="rounded-full border border-[#E5DAC9] bg-[#FBF7F0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6E6A63]"
                >
                  {department}
                </span>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Assessments</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#171411]">
                {assessments.length === 0 ? 'No venue packets yet' : `${assessments.length} saved venue assessment${assessments.length === 1 ? '' : 's'}`}
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            {assessments.map((assessment) => {
              const venue = venueById.get(assessment.venueId)
              return (
                <article
                  key={assessment.id}
                  className="rounded-[30px] border border-[#DED4C4] bg-white p-6 shadow-[0_18px_40px_rgba(17,17,17,0.05)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Venue Profile</p>
                      <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[#171411]">{venue?.name ?? assessment.venueId}</h3>
                      <p className="mt-3 max-w-[58ch] text-[14px] leading-[1.7] text-[#6E6A63]">{assessment.venueProfile.summary}</p>
                    </div>
                    <div className={`rounded-[24px] border px-4 py-3 text-center ${tone(assessment.readinessScore)}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Readiness</p>
                      <p className="mt-2 text-[30px] font-semibold tracking-[-0.04em]">{assessment.readinessScore}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_1.2fr_1fr]">
                    <section className="rounded-[24px] bg-[#F8F3EA] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7453]">Profile</p>
                      <div className="mt-3 space-y-2 text-[13px] leading-[1.65] text-[#5B5145]">
                        {assessment.venueProfile.highlights.map((highlight) => (
                          <p key={highlight}>{highlight}</p>
                        ))}
                        {(venue?.contacts ?? []).slice(0, 2).map((contact) => (
                          <p key={`${contact.name}-${contact.role}`}>{contact.role}: {contact.name}</p>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[24px] bg-[#F8F3EA] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7453]">Compatibility Report</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5B5145]">
                          {reportLabel(assessment.compatibilityReport.status)}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] leading-[1.65] text-[#5B5145]">{assessment.compatibilityReport.summary}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-[#5B5145]">
                        <div className="rounded-[18px] bg-white px-3 py-3">Supported: {assessment.compatibilityReport.supportedCount}</div>
                        <div className="rounded-[18px] bg-white px-3 py-3">Partial: {assessment.compatibilityReport.partialCount}</div>
                        <div className="rounded-[18px] bg-white px-3 py-3">Missing: {assessment.compatibilityReport.missingCount}</div>
                        <div className="rounded-[18px] bg-white px-3 py-3">Unknown: {assessment.compatibilityReport.unknownCount}</div>
                      </div>
                    </section>

                    <section className="rounded-[24px] bg-[#F8F3EA] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7453]">Open Issues</p>
                      <div className="mt-3 space-y-3">
                        {assessment.openIssues.slice(0, 4).map((issue) => (
                          <div key={issue.id} className="rounded-[18px] bg-white px-4 py-3">
                            <p className="text-[12px] font-semibold text-[#171411]">{issue.title}</p>
                            <p className="mt-1 text-[12px] leading-[1.55] text-[#6E6A63]">{issue.detail}</p>
                          </div>
                        ))}
                        {assessment.openIssues.length === 0 ? (
                          <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] text-[#5B5145]">
                            No open issues. This packet currently satisfies the active rider.
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
