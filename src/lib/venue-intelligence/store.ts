import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { deterministicArtifactId, type ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import { bootstrapRuntimeSpine } from '@/lib/runtime/bootstrap'
import { emitRuntimeEvent } from '@/lib/runtime/eventBus'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { buildVenueAssessment } from './compare'
import { combineVenuePacketAssets, extractVenueEntity } from './extract'
import { parseMarkdownRider } from './rider'
import type {
  ProductionRider,
  VenueAssessment,
  VenueEntity,
  VenuePacketAsset,
} from './types'

function venueEntityToDurableEntity(venue: VenueEntity): EntityRecord {
  return {
    id: venue.id,
    name: venue.name,
    type: 'venue',
    aliases: [],
    firstSeen: venue.createdAt,
    lastSeen: venue.updatedAt,
    linkedArtifacts: [venue.sourceArtifactId],
    linkedThreads: ['venue-intelligence'],
    operationalContexts: ['venue-intelligence'],
    continuityCount: 1,
    unresolvedLinks: 0,
    relatedArtifacts: [venue.sourceArtifactId],
    relatedThreads: ['venue-intelligence'],
    temporalClusters: [venue.createdAt.slice(0, 10)],
  }
}

function venuePacketArtifact(input: {
  venueId: string
  fileName: string
  mimeType: string
  packetText: string
  workspaceId: string
  createdAt: string
}): ArtifactRecord {
  const title = `${input.venueId} packet`
  return {
    id: deterministicArtifactId({
      title,
      threadId: 'venue-intelligence',
      sessionId: 'venue-upload',
      createdAt: input.createdAt,
    }),
    title,
    threadId: 'venue-intelligence',
    sessionId: 'venue-upload',
    text: input.packetText,
    fileName: input.fileName,
    mimeType: input.mimeType,
    entities: [input.venueId],
    projects: [input.workspaceId],
    lineageId: `lineage:${input.venueId}`,
    artifactGroupId: 'venue-intelligence',
    createdAt: input.createdAt,
    pinned: false,
    classification: 'runtime_artifact',
  }
}

function mapDbVenue(row: Record<string, unknown>): VenueEntity {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    name: String(row.name),
    packetFileName: String(row.packet_file_name ?? ''),
    sourceArtifactId: String(row.source_artifact_id ?? ''),
    packetText: String(row.packet_text ?? ''),
    confidence: typeof row.confidence === 'number' ? row.confidence : Number(row.confidence ?? 0),
    profileSummary: String(row.profile_summary ?? ''),
    location: typeof row.location === 'string' ? row.location : undefined,
    capacities: Array.isArray(row.capacities) ? row.capacities.map(String) : [],
    stage: (row.stage ?? {}) as VenueEntity['stage'],
    rigging: (row.rigging ?? { notes: [] }) as VenueEntity['rigging'],
    power: (row.power ?? { services: [], notes: [] }) as VenueEntity['power'],
    loading: (row.loading ?? { truckAccessNotes: [] }) as VenueEntity['loading'],
    audio: (row.audio ?? { available: [], missing: [], notes: [] }) as VenueEntity['audio'],
    lighting: (row.lighting ?? { available: [], missing: [], notes: [] }) as VenueEntity['lighting'],
    video: (row.video ?? { available: [], missing: [], notes: [] }) as VenueEntity['video'],
    communications: (row.communications ?? { available: [], missing: [], notes: [] }) as VenueEntity['communications'],
    hospitality: (row.hospitality ?? { available: [], missing: [], notes: [] }) as VenueEntity['hospitality'],
    restrictions: Array.isArray(row.restrictions) ? row.restrictions as VenueEntity['restrictions'] : [],
    contacts: Array.isArray(row.contacts) ? row.contacts as VenueEntity['contacts'] : [],
    rawFacts: Array.isArray(row.raw_facts) ? row.raw_facts.map(String) : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapDbRider(row: Record<string, unknown>): ProductionRider {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    title: String(row.title),
    sourceArtifactId: typeof row.source_artifact_id === 'string' ? row.source_artifact_id : undefined,
    isActive: Boolean(row.is_active),
    departments: Array.isArray(row.departments) ? row.departments.map(String) : [],
    requirements: Array.isArray(row.requirements) ? row.requirements as ProductionRider['requirements'] : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapDbAssessment(row: Record<string, unknown>): VenueAssessment {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    venueId: String(row.venue_id),
    riderId: String(row.rider_id),
    venueProfile: (row.venue_profile ?? {}) as VenueAssessment['venueProfile'],
    compatibilityReport: (row.compatibility_report ?? {}) as VenueAssessment['compatibilityReport'],
    openIssues: Array.isArray(row.open_issues) ? row.open_issues as VenueAssessment['openIssues'] : [],
    readinessScore: typeof row.readiness_score === 'number' ? row.readiness_score : Number(row.readiness_score ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function ensureActiveProductionRider(workspaceId = SHOWTELA_WORKSPACE_ID): Promise<ProductionRider> {
  const db = getSupabaseServerClient()
  const { data, error } = await db
    .from('production_riders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`load active rider failed: ${error.message}`)
  if (data) return mapDbRider(data)

  const proofPath = path.join(process.cwd(), 'proof', 'crusade-june1-rider.md')
  const proofText = await fs.readFile(proofPath, 'utf8')
  const now = new Date().toISOString()
  const rider = parseMarkdownRider(proofText, {
    workspaceId,
    sourceArtifactId: 'proof:crusade-june1-rider',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })

  const { error: upsertError } = await db.from('production_riders').upsert({
    id: rider.id,
    workspace_id: rider.workspaceId,
    title: rider.title,
    source_artifact_id: rider.sourceArtifactId ?? null,
    is_active: true,
    departments: rider.departments,
    requirements: rider.requirements,
    created_at: rider.createdAt,
    updated_at: rider.updatedAt,
  }, { onConflict: 'id' })

  if (upsertError) throw new Error(`seed active rider failed: ${upsertError.message}`)
  return rider
}

export async function ingestVenuePacket(input: {
  workspaceId?: string
  assets: VenuePacketAsset[]
}): Promise<{
  venue: VenueEntity
  rider: ProductionRider
  assessment: VenueAssessment
}> {
  const workspaceId = input.workspaceId?.trim() || SHOWTELA_WORKSPACE_ID
  const primaryAsset = input.assets[0]
  if (!primaryAsset) throw new Error('At least one venue packet file is required')

  const createdAt = new Date().toISOString()
  const packetText = combineVenuePacketAssets(input.assets)
  const artifact = venuePacketArtifact({
    venueId: primaryAsset.name.replace(/\.[^.]+$/, ''),
    fileName: primaryAsset.name,
    mimeType: primaryAsset.mimeType,
    packetText,
    workspaceId,
    createdAt,
  })

  const pdfBase64 = primaryAsset.mimeType === 'application/pdf'
    ? primaryAsset.base64Data
    : undefined

  const extractedText = primaryAsset.mimeType === 'application/pdf'
    ? packetText
    : primaryAsset.text

  const venue = await extractVenueEntity({
    workspaceId,
    fileName: primaryAsset.name,
    artifactId: artifact.id,
    packetText: extractedText,
    pdfBase64,
    createdAt,
  })

  artifact.title = `${venue.name} packet`
  artifact.entities = [venue.name]

  const rider = await ensureActiveProductionRider(workspaceId)
  const assessment = buildVenueAssessment({
    workspaceId,
    venue,
    rider,
    createdAt,
  })

  await persistDurableContinuity(workspaceId, {
    artifacts: [artifact],
    entities: [venueEntityToDurableEntity(venue)],
    snapshots: [],
  })

  const db = getSupabaseServerClient()

  const { error: venueError } = await db.from('venue_entities').upsert({
    id: venue.id,
    workspace_id: venue.workspaceId,
    name: venue.name,
    packet_file_name: venue.packetFileName,
    source_artifact_id: venue.sourceArtifactId,
    packet_text: venue.packetText,
    confidence: venue.confidence,
    profile_summary: venue.profileSummary,
    location: venue.location ?? null,
    capacities: venue.capacities,
    stage: venue.stage,
    rigging: venue.rigging,
    power: venue.power,
    loading: venue.loading,
    audio: venue.audio,
    lighting: venue.lighting,
    video: venue.video,
    communications: venue.communications,
    hospitality: venue.hospitality,
    restrictions: venue.restrictions,
    contacts: venue.contacts,
    raw_facts: venue.rawFacts,
    created_at: venue.createdAt,
    updated_at: venue.updatedAt,
  }, { onConflict: 'id' })

  if (venueError) throw new Error(`persist venue failed: ${venueError.message}`)

  const { error: assessmentError } = await db.from('venue_assessments').upsert({
    id: assessment.id,
    workspace_id: assessment.workspaceId,
    venue_id: assessment.venueId,
    rider_id: assessment.riderId,
    venue_profile: assessment.venueProfile,
    compatibility_report: assessment.compatibilityReport,
    open_issues: assessment.openIssues,
    readiness_score: assessment.readinessScore,
    created_at: assessment.createdAt,
    updated_at: assessment.updatedAt,
  }, { onConflict: 'id' })

  if (assessmentError) throw new Error(`persist venue assessment failed: ${assessmentError.message}`)

  bootstrapRuntimeSpine()
  await emitRuntimeEvent({
    workspaceId,
    type: 'venue.intelligence.generated',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    lineageId: `lineage:${venue.id}`,
    payloadType: 'venue.intelligence',
    payload: {
      venueId: venue.id,
      venueName: venue.name,
      riderId: rider.id,
      assessmentId: assessment.id,
      readinessScore: assessment.readinessScore,
      sourceArtifactId: artifact.id,
    },
  })

  return { venue, rider, assessment }
}

export async function loadVenueDashboard(workspaceId = SHOWTELA_WORKSPACE_ID) {
  const rider = await ensureActiveProductionRider(workspaceId)
  const db = getSupabaseServerClient()

  const [{ data: venues, error: venueError }, { data: assessments, error: assessmentError }] = await Promise.all([
    db.from('venue_entities')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false }),
    db.from('venue_assessments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false }),
  ])

  if (venueError) throw new Error(`load venues failed: ${venueError.message}`)
  if (assessmentError) throw new Error(`load venue assessments failed: ${assessmentError.message}`)

  return {
    rider,
    venues: (venues ?? []).map(mapDbVenue),
    assessments: (assessments ?? []).map(mapDbAssessment),
  }
}
