import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { normalizeShowTelaName, registerShowTelaRename, resolveShowTela } from '@/lib/showtela/lifecycle'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL('/signin', req.url))

  const formData = await req.formData()
  const showTelaId = String(formData.get('showTelaId') ?? '').trim()
  const newName = normalizeShowTelaName(String(formData.get('showTelaName') ?? ''))

  if (!showTelaId) {
    return NextResponse.redirect(new URL('/?error=Rename+request+was+missing+an+id.', req.url))
  }

  if (newName.length < 3) {
    return NextResponse.redirect(
      new URL(`/?error=ShowTELA+name+must+be+at+least+3+characters.&showtela=${encodeURIComponent(showTelaId)}`, req.url),
    )
  }

  const showTela = await resolveShowTela(showTelaId)
  if (!showTela) {
    return NextResponse.redirect(new URL('/?error=ShowTELA+not+found.', req.url))
  }

  await registerShowTelaRename({
    workspaceId: showTela.workspaceId,
    showTelaName: newName,
    renamedBy: session.name,
  })

  return NextResponse.redirect(new URL('/?showtela_renamed=1', req.url))
}
