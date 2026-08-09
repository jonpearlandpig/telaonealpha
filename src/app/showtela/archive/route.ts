import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAuthBaseUrl } from '@/lib/auth-config'
import { registerShowTelaArchive, resolveShowTela } from '@/lib/showtela/lifecycle'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/signin', `${getAuthBaseUrl()}/`))
  }

  const formData = await req.formData()
  const showTelaId = String(formData.get('showTelaId') ?? '').trim()

  if (!showTelaId) {
    return NextResponse.redirect(new URL('/?error=ShowTELA%20archive%20request%20was%20missing%20an%20id.', req.url))
  }

  const showTela = await resolveShowTela(showTelaId)
  if (!showTela) {
    return NextResponse.redirect(new URL('/?error=ShowTELA%20not%20found.', req.url))
  }

  if (showTela.status === 'archived') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  await registerShowTelaArchive({
    workspaceId: showTela.workspaceId,
    showTelaId: showTela.showTelaId,
    showTelaName: showTela.showTelaName,
    archivedBy: session.name,
  })

  return NextResponse.redirect(new URL('/?showtela_archived=1', req.url))
}
