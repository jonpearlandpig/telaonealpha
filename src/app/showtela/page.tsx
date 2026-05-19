import { ShowTelaRuntime } from '@/components/showtela/ShowTelaRuntime'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import { getSession } from '@/lib/auth'
import type { ShowTelaViewModel } from '@/components/showtela/types'

export const dynamic = 'force-dynamic'

export default async function ShowTelaHome() {
  const [data, session] = await Promise.all([
    getShowTelaHome(),
    getSession(),
  ])

  const user = session ? {
    name: session.name,
    email: session.email,
    image: session.image,
  } : undefined

  const sortedActiveOps = [...data.activeOps].sort((a, b) => {
    const aIsUser = session && a.name.toLowerCase().includes(session.name.split(' ')[0].toLowerCase())
    const bIsUser = session && b.name.toLowerCase().includes(session.name.split(' ')[0].toLowerCase())
    if (aIsUser) return -1
    if (bIsUser) return 1
    return (b.unresolvedCount ?? 0) - (a.unresolvedCount ?? 0)
  })

  const vm: ShowTelaViewModel = {
    activeOps: sortedActiveOps.map((p) => {
      const isCurrentUser = session && (
        p.name.toLowerCase().includes(session.name.split(' ')[0].toLowerCase()) ||
        session.name.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
      )
      return {
        id: p.id,
        name: p.name === 'TBD' ? (p.role ?? 'TBD') : p.name,
        image: isCurrentUser ? session.image : (p.avatar ?? ''),
        latest: p.role ?? '',
        unresolvedCount: p.unresolvedCount ?? 0,
      }
    }),
    fluencyPartners: data.fluencyPartners.map((p) => ({
      id: p.id,
      name: p.name === 'TBD' ? (p.role ?? 'TBD') : p.name,
      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
      label: p.role ?? '',
    })),
    crusadeOperations: data.operations.map((o) => ({
      id: o.id,
      name: o.title,
      label: o.title,
      image: '',
      latest: o.latestMovement ?? '',
      unresolvedCount: o.unresolvedCount ?? 0,
    })),
    unresolvedPressure: {
      unresolvedCount: data.unresolved.length,
      overdueCount: data.unresolved.filter((u) => u.severity === 'high').length,
      blockedCount: data.unresolved.filter((u) => u.blocking).length,
      pendingApprovals: data.unresolved.filter((u) => u.severity === 'medium').length,
    },
    unresolved: data.unresolved.map((u) => ({
      id: u.id,
      title: u.title,
      severity: u.severity,
      blocking: u.blocking,
      operation: u.operation,
      aging: u.aging,
    })),
    feed: data.continuityFeed.map((e) => ({
      id: e.id,
      timestamp: e.timestamp ?? '',
      title: e.headline,
      summary: e.body ?? '',
      owner: e.owner?.name ?? '',
      image: e.image ?? '',
      avatar: '',
      unresolved: e.isNew ?? false,
      linkedEntities: e.tags ?? [],
    })),
    continuityObjects: [],
    runtimeTimeline: data.runtimeTimeline,
  }

  return (
    <main className='mx-auto min-h-screen max-w-md bg-[#F8F6F2] pb-28 text-[#13110D]'>
      <ShowTelaRuntime vm={vm} user={user} />
    </main>
  )
}
