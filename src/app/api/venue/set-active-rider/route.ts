import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setActiveRider } from '@/lib/supabase/queries'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { ACTIONS } from '@/lib/runtime/actions'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as { venueId?: string; artifactId?: string }

  if (!body.venueId || !body.artifactId) {
    return NextResponse.json({ error: 'venueId and artifactId are required' }, { status: 422 })
  }

  const { venueId, artifactId } = body

  await setActiveRider(SHOWTELA_WORKSPACE_ID, venueId, artifactId)

  // Emit venue.brief.initiated lineage event — matches existing MUTATION_EVENT_TYPES
  // This signals that an active rider has been designated for this venue.
  const eventPayload = {
    action: ACTIONS.INITIATE_VENUE_BRIEF,
    venueId,
    artifactId,
    designatedAt: new Date().toISOString(),
    entityId: venueId,
  }

  console.log('[venue:set-active-rider] rider promoted', { venueId, artifactId, event: 'venue.brief.initiated', payload: eventPayload })

  return NextResponse.json({
    ok: true,
    venueId,
    artifactId,
    event: 'venue.brief.initiated',
  })
}
