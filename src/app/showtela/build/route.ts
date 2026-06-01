import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  createShowTelaWorkspaceId,
  isCleanShowTela,
  normalizeShowTelaName,
  registerShowTelaCreation,
  verifyCleanShowTela,
} from '@/lib/showtela/lifecycle'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL('/signin', req.url))

  const formData = await req.formData()
  const showTelaName = normalizeShowTelaName(String(formData.get('showTelaName') ?? ''))

  if (showTelaName.length < 3) {
    const params = new URLSearchParams({
      error: 'ShowTELA name must be at least 3 characters.',
      showtela_name: showTelaName,
    })
    return NextResponse.redirect(new URL(`/?${params.toString()}`, req.url))
  }

  const workspaceId = createShowTelaWorkspaceId(showTelaName)
  const verification = await verifyCleanShowTela(workspaceId)

  if (!isCleanShowTela(verification)) {
    const params = new URLSearchParams({
      error: 'New ShowTELA did not open in a clean state.',
      showtela_name: showTelaName,
    })
    return NextResponse.redirect(new URL(`/?${params.toString()}`, req.url))
  }

  const registryEntry = await registerShowTelaCreation({
    workspaceId,
    showTelaName,
    founderName: session.name,
    founderEmail: session.email,
  })

  const params = new URLSearchParams({
    showtela: registryEntry.showTelaId,
    showtela_created: '1',
  })

  return NextResponse.redirect(new URL(`/?${params.toString()}`, req.url))
}
