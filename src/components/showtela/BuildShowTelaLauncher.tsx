import Link from 'next/link'

type LauncherProps = {
  user: { name: string; email: string; image: string }
  initialName?: string
  error?: string
  activeShowTelas: Array<{
    showTelaId: string
    showTelaName: string
    createdAt: string
    lastActivityAt: string
  }>
  archivedShowTelas: Array<{
    showTelaId: string
    showTelaName: string
    createdAt: string
    lastActivityAt: string
    archivedAt: string
  }>
  createdShowTelaId?: string
  showTelaCreated?: boolean
}

function formatDateLabel(value: string, includeTime = false) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

export function BuildShowTelaLauncher({
  user,
  initialName,
  error,
  activeShowTelas,
  archivedShowTelas,
  createdShowTelaId,
  showTelaCreated,
}: LauncherProps) {
  const createdShowTela = createdShowTelaId
    ? activeShowTelas.find((entry) => entry.showTelaId === createdShowTelaId)
    : undefined

  return (
    <main className="min-h-screen bg-[#0D0E12] px-5 py-8 text-[#F8F6F2]">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C89B2F]">ShowTELA</p>
        <h1 className="mt-4 text-[46px] font-semibold leading-[0.95] tracking-[-0.05em]">
          Active ShowTELAs
        </h1>
        <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.65] text-[#CFC5B8]">
          Build a clean ShowTELA, see what is active, and reopen saved show history without exposing internal system language.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-[32px] border border-[#2A2D34] bg-[linear-gradient(180deg,#171A21_0%,#101217_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <div>
	                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Active List</p>
                <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#F8F6F2]">Active ShowTELAs</p>
              </div>
              <div className="rounded-full border border-[#3A3E47] bg-[#111319] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFC5B8]">
                {activeShowTelas.length} Active
              </div>
            </div>

            {showTelaCreated && createdShowTela ? (
              <div className="mt-6 rounded-[24px] border border-[#4A3D1F] bg-[linear-gradient(180deg,rgba(200,155,47,0.18)_0%,rgba(200,155,47,0.07)_100%)] px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D9B35A]">ShowTELA Created</p>
                <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#F8F6F2]">{createdShowTela.showTelaName}</p>
                <p className="mt-2 text-[13px] leading-[1.65] text-[#E1D4BF]">
	                  Clean state verified. Reopen it from the active list and begin updates.
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {activeShowTelas.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#3A3E47] bg-[#111319] px-5 py-6">
                  <p className="text-[16px] font-semibold text-[#F8F6F2]">No active ShowTELAs yet</p>
                  <p className="mt-2 max-w-[36ch] text-[13px] leading-[1.65] text-[#A89B8D]">
	                    Build the first ShowTELA to start from a clean state and register it here.
                  </p>
                </div>
              ) : (
                activeShowTelas.map((entry) => (
                  <article key={entry.showTelaId} className="rounded-[24px] border border-[#2F343E] bg-[#111319] px-5 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[20px] font-semibold tracking-[-0.03em] text-[#F8F6F2]">{entry.showTelaName}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-[#C9BEAE]">
                          <span className="rounded-full border border-[#30343D] bg-[#181B21] px-3 py-2">
                            Created {formatDateLabel(entry.createdAt)}
                          </span>
                          <span className="rounded-full border border-[#30343D] bg-[#181B21] px-3 py-2">
                            Last Activity {formatDateLabel(entry.lastActivityAt, true)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <Link
                          href={`/showtela?showtela=${encodeURIComponent(entry.showTelaId)}`}
                          className="inline-flex rounded-full bg-[#C89B2F] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0D0E12]"
                        >
                          Open ShowTELA
                        </Link>
                        <form action="/showtela/archive" method="post">
                          <input type="hidden" name="showTelaId" value={entry.showTelaId} />
                          <button
                            type="submit"
                            className="inline-flex rounded-full border border-[#3A3E47] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFC5B8]"
                          >
                            Archive
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Archive</p>
                  <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#F8F6F2]">Archived ShowTELAs</p>
                </div>
                <div className="rounded-full border border-[#3A3E47] bg-[#111319] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFC5B8]">
                  {archivedShowTelas.length} Archived
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {archivedShowTelas.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#3A3E47] bg-[#111319] px-5 py-6">
                    <p className="text-[16px] font-semibold text-[#F8F6F2]">No archived ShowTELAs yet</p>
                    <p className="mt-2 max-w-[36ch] text-[13px] leading-[1.65] text-[#A89B8D]">
	                      Archive preserves saved history. Nothing is deleted.
                    </p>
                  </div>
                ) : (
                  archivedShowTelas.map((entry) => (
                    <article key={entry.showTelaId} className="rounded-[24px] border border-[#2F343E] bg-[#0E1015] px-5 py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[20px] font-semibold tracking-[-0.03em] text-[#F8F6F2]">{entry.showTelaName}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-[#C9BEAE]">
                            <span className="rounded-full border border-[#30343D] bg-[#181B21] px-3 py-2">
                              Archived {formatDateLabel(entry.archivedAt, true)}
                            </span>
                            <span className="rounded-full border border-[#30343D] bg-[#181B21] px-3 py-2">
	                              Saved History Available
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/showtela?showtela=${encodeURIComponent(entry.showTelaId)}`}
                          className="inline-flex rounded-full border border-[#C89B2F] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#E6C570]"
                        >
	                          Open History
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <form
            action="/showtela/build"
            method="post"
            className="rounded-[32px] border border-[#2A2D34] bg-[linear-gradient(180deg,#171A21_0%,#101217_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Founder Flow</p>
                <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#F8F6F2]">Build ShowTELA</p>
              </div>
              <div className="rounded-full border border-[#3A3E47] bg-[#111319] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFC5B8]">
                {user.name}
              </div>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A99676]">ShowTELA Name</span>
              <input
                name="showTelaName"
                defaultValue={initialName}
                placeholder="Crusade 2027"
                className="w-full rounded-[20px] border border-[#2F343E] bg-[#0F1116] px-4 py-4 text-[16px] text-[#F8F6F2] outline-none placeholder:text-[#72685D]"
              />
            </label>

            <div className="mt-6 grid grid-cols-2 gap-3 text-[12px] text-[#D7CCBE] sm:grid-cols-5">
              <div className="rounded-[18px] border border-[#2F343E] bg-[#111319] px-3 py-3">
                <p className="font-semibold text-[#F8F6F2]">People</p>
                <p className="mt-1 text-[#9A7C46]">0</p>
              </div>
              <div className="rounded-[18px] border border-[#2F343E] bg-[#111319] px-3 py-3">
                <p className="font-semibold text-[#F8F6F2]">Operations</p>
                <p className="mt-1 text-[#9A7C46]">0</p>
              </div>
              <div className="rounded-[18px] border border-[#2F343E] bg-[#111319] px-3 py-3">
                <p className="font-semibold text-[#F8F6F2]">Calendar</p>
                <p className="mt-1 text-[#9A7C46]">0</p>
              </div>
              <div className="rounded-[18px] border border-[#2F343E] bg-[#111319] px-3 py-3">
	                <p className="font-semibold text-[#F8F6F2]">Files</p>
                <p className="mt-1 text-[#9A7C46]">0</p>
              </div>
              <div className="rounded-[18px] border border-[#2F343E] bg-[#111319] px-3 py-3">
                <p className="font-semibold text-[#F8F6F2]">Events</p>
                <p className="mt-1 text-[#9A7C46]">0</p>
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-[18px] border border-[#5E2F2A] bg-[#291614] px-4 py-3 text-[13px] leading-relaxed text-[#F3CBC4]">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="max-w-[28ch] text-[12px] leading-[1.65] text-[#A89B8D]">
	                Build a clean ShowTELA, register it to the active list, then reopen it to begin updates.
              </p>
              <button
                type="submit"
                className="rounded-full bg-[#C89B2F] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0D0E12]"
              >
                Build ShowTELA
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
