import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { BuildShowTelaLauncher } from '@/components/showtela/BuildShowTelaLauncher'
import { listActiveShowTelas, listArchivedShowTelas } from '@/lib/showtela/lifecycle'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  const params = searchParams ? await searchParams : {}

  if (!session) {
    redirect('/signin')
  }

  const [activeShowTelas, archivedShowTelas] = await Promise.all([
    listActiveShowTelas(),
    listArchivedShowTelas(),
  ])
  const initialName = Array.isArray(params.showtela_name) ? params.showtela_name[0] : params.showtela_name
  const error = Array.isArray(params.error) ? params.error[0] : params.error
  const createdShowTelaId = Array.isArray(params.showtela) ? params.showtela[0] : params.showtela
  const showTelaCreated = (Array.isArray(params.showtela_created) ? params.showtela_created[0] : params.showtela_created) === '1'

  return (
    <BuildShowTelaLauncher
      user={session}
      initialName={initialName}
      error={error}
      activeShowTelas={activeShowTelas}
      archivedShowTelas={archivedShowTelas}
      createdShowTelaId={createdShowTelaId}
      showTelaCreated={showTelaCreated}
    />
  )
}
