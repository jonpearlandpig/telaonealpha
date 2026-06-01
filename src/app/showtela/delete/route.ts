import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteShowTela, resolveShowTela } from '@/lib/showtela/lifecycle'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL('/signin', req.url))

  const formData = await req.formData()
  const showTelaId = String(formData.get('showTelaId') ?? '').trim()
  const confirmName = String(formData.get('confirmName') ?? '').trim()

  if (!showTelaId) {
    return NextResponse.redirect(new URL('/?error=Delete+request+was+missing+an+id.', req.url))
  }

  const showTela = await resolveShowTela(showTelaId)
  if (!showTela) {
    return NextResponse.redirect(new URL('/?error=ShowTELA+not+found.', req.url))
  }

  const normalizedConfirm = confirmName.trim().toLowerCase()
  const normalizedName = showTela.showTelaName.trim().toLowerCase()

  if (normalizedConfirm !== normalizedName) {
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(`Type the ShowTELA name exactly to confirm deletion.`)}&showtela=${encodeURIComponent(showTelaId)}`,
        req.url,
      ),
    )
  }

  const { deleted } = await deleteShowTela(showTela.workspaceId)

  const totalDeleted = Object.values(deleted).reduce((sum, n) => sum + n, 0)
  console.log(`[deleteShowTela] completed by ${session.name} — workspaceId: ${showTela.workspaceId} — total records deleted: ${totalDeleted}`, deleted)

  return NextResponse.redirect(new URL('/?showtela_deleted=1', req.url))
}
