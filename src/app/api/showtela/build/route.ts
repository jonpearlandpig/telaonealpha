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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as { showTelaName?: string }
    const showTelaName = normalizeShowTelaName(body.showTelaName ?? '')

    if (showTelaName.length < 3) {
      return NextResponse.json(
        { error: 'ShowTELA name must be at least 3 characters.' },
        { status: 422 },
      )
    }

    const workspaceId = createShowTelaWorkspaceId(showTelaName)
    const verification = await verifyCleanShowTela(workspaceId)

    if (!isCleanShowTela(verification)) {
      return NextResponse.json(
        {
          error: 'New ShowTELA did not open in a clean state.',
          verification,
        },
        { status: 409 },
      )
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

    return NextResponse.json({
      ok: true,
      showTelaId: registryEntry.showTelaId,
      showTelaName,
      workspaceId,
      verification,
      homeUrl: `/?${params.toString()}`,
      openUrl: `/showtela?showtela=${encodeURIComponent(registryEntry.showTelaId)}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
