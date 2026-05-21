import { ShowTelaRuntime } from '@/components/showtela/ShowTelaRuntime'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import { buildShowTelaVM } from '@/lib/showtela/buildViewModel'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function upgradeGooglePhoto(url: string): string {
  if (!url) return url
  return url.replace(/=s\d+-c/, '=s400-c').replace(/s96-c/, 's400-c')
}

export default async function ShowTelaHome() {
  const [data, session] = await Promise.all([
    getShowTelaHome(),
    getSession(),
  ])

  const userImage = session?.image ? upgradeGooglePhoto(session.image) : undefined

  const user = session ? {
    name: session.name,
    email: session.email,
    image: userImage ?? session.image,
  } : undefined

  const vm = buildShowTelaVM(data)

  // Apply user-specific avatar and sort current user to front — server-only since it needs session
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
    <main className='mx-auto min-h-screen max-w-md bg-[#F8F6F2] pb-28 text-[#13110D]'>
      <ShowTelaRuntime vm={vm} user={user} />
    </main>
  )
}
