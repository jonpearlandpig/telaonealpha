import { ShowTelaRuntime } from '@/components/showtela/ShowTelaRuntime'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildShowTelaVMFromHydratedState } from '@/lib/showtela/buildViewModel'
import { buildFocusEngine } from '@/lib/focus/focusBuilder'
import { buildBriefingEngine } from '@/lib/briefing/briefingBuilder'
import { buildReplayEngine } from '@/lib/replay/replayBuilder'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function upgradeGooglePhoto(url: string): string {
  if (!url) return url
  return url.replace(/=s\d+-c/, '=s400-c').replace(/s96-c/, 's400-c')
}

export default async function ShowTelaByIdPage({
  params,
}: {
  params: Promise<{ showTelaId: string }>
}) {
  const { showTelaId } = await params

  const [state, session] = await Promise.all([
    hydrateRuntime(showTelaId),
    getSession(),
  ])

  const userImage = session?.image ? upgradeGooglePhoto(session.image) : undefined

  const user = session ? {
    name: session.name,
    email: session.email,
    image: userImage ?? session.image,
  } : undefined

  const focusResult = buildFocusEngine(state.operationalProjection)
  const briefing = buildBriefingEngine({
    continuityFeed: state.continuityFeed,
    projection: state.operationalProjection,
    focusResult,
    unresolvedIds: state.unresolved.incompleteArtifacts,
  })
  const replay = buildReplayEngine({
    continuityFeed: state.continuityFeed,
    projection: state.operationalProjection,
    focusResult,
    currentReadiness: briefing.currentReadiness,
  })

  const vm = buildShowTelaVMFromHydratedState(state)

  if (session) {
    const firstName = session.name.split(' ')[0].toLowerCase()
    vm.activeOps = vm.activeOps
      .map(p => {
        const isCurrentUser =
          p.name.toLowerCase().includes(firstName) ||
          session.name.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
        return { ...p, image: isCurrentUser ? (userImage ?? session.image ?? p.image) : p.image }
      })
      .sort((a, b) => {
        const aIsUser = a.name.toLowerCase().includes(firstName)
        const bIsUser = b.name.toLowerCase().includes(firstName)
        if (aIsUser) return -1
        if (bIsUser) return 1
        return (b.unresolvedCount ?? 0) - (a.unresolvedCount ?? 0)
      })
  }

  return (
    <ShowTelaRuntime
      vm={vm}
      user={user}
      briefing={briefing}
      focus={focusResult}
      replay={replay}
      projection={state.operationalProjection}
      showTelaId={showTelaId}
    />
  )
}
