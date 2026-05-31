import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getVenueEntity, listVenueArtifacts } from '@/lib/supabase/queries'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export type VenueRiderEntry = {
  id: string
  fileName?: string
  createdAt: string
  isActive: boolean
}

export type VenueIntelligenceResponse = {
  id: string
  name: string
  city?: string
  state?: string
  contact?: string
  loadIn?: string
  loadOut?: string
  departments: string[]
  activeRider: VenueRiderEntry | null
  riderHistory: VenueRiderEntry[]
}

type RiderStructure = {
  documentType?: string
  venueId?: string
  venueName?: string
  city?: string
  state?: string
  loadIn?: string
  loadOut?: string
  contact?: string
  departments?: string[]
}

function parseRiderStructure(payload?: string): RiderStructure {
  if (!payload) return {}
  try {
    const parsed = JSON.parse(payload) as { structure?: string }
    if (parsed.structure) return JSON.parse(parsed.structure) as RiderStructure
  } catch { /* ignore parse errors */ }
  return {}
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { venueId } = await params

  const [entity, artifacts] = await Promise.all([
    getVenueEntity(SHOWTELA_WORKSPACE_ID, venueId),
    listVenueArtifacts(SHOWTELA_WORKSPACE_ID, venueId),
  ])

  if (!entity) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  // city/state stored in entity aliases: aliases[0]=city, aliases[1]=state
  const entityAliases = (entity as unknown as { aliases?: string[] }).aliases ?? []
  const entityCity = entityAliases[0]
  const entityState = entityAliases[1]

  // Find active rider and extract specs from its structure
  const activeArtifact = artifacts.find(a => a.isActiveRider)
  const activeSpecs = parseRiderStructure(activeArtifact?.payload)

  // For departments and specs: use active rider if available, else most recent
  const primaryArtifact = activeArtifact ?? artifacts[0]
  const primarySpecs = primaryArtifact ? parseRiderStructure(primaryArtifact.payload) : {}

  const riderHistory: VenueRiderEntry[] = artifacts.map(a => ({
    id: a.id,
    fileName: a.fileName,
    createdAt: a.createdAt,
    isActive: a.isActiveRider ?? false,
  }))

  const response: VenueIntelligenceResponse = {
    id: entity.id,
    name: entity.name,
    city: entityCity ?? primarySpecs.city,
    state: entityState ?? primarySpecs.state,
    contact: (activeSpecs.contact ?? primarySpecs.contact),
    loadIn: (activeSpecs.loadIn ?? primarySpecs.loadIn),
    loadOut: (activeSpecs.loadOut ?? primarySpecs.loadOut),
    departments: activeSpecs.departments ?? primarySpecs.departments ?? [],
    activeRider: activeArtifact
      ? { id: activeArtifact.id, fileName: activeArtifact.fileName, createdAt: activeArtifact.createdAt, isActive: true }
      : null,
    riderHistory,
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
