import { loadDurableContinuity } from '@/lib/runtime/durableMemory'
import { getAllReplayEventsForWorkspace, persistRuntimeEvent } from '@/lib/runtime/eventStore'
import { createRuntimeEvent, type RuntimeEventPayload } from '@/lib/runtime/runtimeTypes'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { buildShowTelaVMFromHydratedState } from './buildViewModel'
import {
  SHOWTELA_ARCHIVED_EVENT_TYPE,
  SHOWTELA_CREATED_EVENT_TYPE,
  SHOWTELA_RENAMED_EVENT_TYPE,
  buildShowTelaRegistry,
  type ActiveShowTela,
  type ArchivedShowTela,
  type ShowTelaActivityRow,
  type ShowTelaArchivedEventRow,
  type ShowTelaCreatedEventRow,
  type ShowTelaRenamedEventRow,
} from './lifecycleRegistry'

export type ShowTelaBuildVerification = {
  people: number
  operations: number
  calendar: number
  artifacts: number
  events: number
  continuity: number
}

type ShowTelaCreatedPayload = RuntimeEventPayload & {
  showTelaName: string
  founderName?: string
  founderEmail?: string
}

type ShowTelaArchivedPayload = RuntimeEventPayload & {
  showTelaId: string
  showTelaName: string
  archivedBy?: string
}

type ShowTelaRenamedPayload = RuntimeEventPayload & {
  showTelaName: string
  renamedBy?: string
}

export const SHOWTELA_LIFECYCLE_PAYLOAD_TYPE = 'showtela.lifecycle'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeShowTelaName(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

export function createShowTelaWorkspaceId(showTelaName: string) {
  const slug = slugify(showTelaName).slice(0, 40) || 'showtela'
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  return `showtela-${slug}-${suffix}`
}

export async function registerShowTelaCreation(input: {
  workspaceId: string
  showTelaName: string
  founderName?: string
  founderEmail?: string
}) {
  const event = createRuntimeEvent<ShowTelaCreatedPayload>({
    workspaceId: input.workspaceId,
    type: SHOWTELA_CREATED_EVENT_TYPE,
    payloadType: SHOWTELA_LIFECYCLE_PAYLOAD_TYPE,
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {
      showTelaName: normalizeShowTelaName(input.showTelaName),
      founderName: input.founderName,
      founderEmail: input.founderEmail,
    },
  })

  const result = await persistRuntimeEvent(event)
  if (!result.persisted) {
    throw new Error(result.error ?? 'Failed to register ShowTELA creation.')
  }

  return {
    showTelaId: event.id,
    workspaceId: input.workspaceId,
    showTelaName: normalizeShowTelaName(input.showTelaName),
    createdAt: event.createdAt,
  }
}

export async function listActiveShowTelas(): Promise<ActiveShowTela[]> {
  const supabase = getSupabaseServerClient()
  const { active } = await listShowTelaRegistry(supabase)
  return active
}

export async function listArchivedShowTelas(): Promise<ArchivedShowTela[]> {
  const supabase = getSupabaseServerClient()
  const { archived } = await listShowTelaRegistry(supabase)
  return archived
}

export async function resolveShowTela(showTelaId: string): Promise<ActiveShowTela | ArchivedShowTela | null> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('runtime_events')
    .select('id, workspace_id, created_at, payload')
    .eq('id', showTelaId)
    .eq('type', SHOWTELA_CREATED_EVENT_TYPE)
    .maybeSingle()

  if (error) {
    throw new Error(`resolveShowTela: ${error.message}`)
  }

  if (!data) return null

  const row = data as ShowTelaCreatedEventRow
  const { active, archived } = await buildRegistryForWorkspace(supabase, row.workspace_id, [row])
  return active[0] ?? archived[0] ?? null
}

export async function registerShowTelaArchive(input: {
  workspaceId: string
  showTelaId: string
  showTelaName: string
  archivedBy?: string
}) {
  const event = createRuntimeEvent<ShowTelaArchivedPayload>({
    workspaceId: input.workspaceId,
    type: SHOWTELA_ARCHIVED_EVENT_TYPE,
    payloadType: SHOWTELA_LIFECYCLE_PAYLOAD_TYPE,
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {
      showTelaId: input.showTelaId,
      showTelaName: normalizeShowTelaName(input.showTelaName),
      archivedBy: input.archivedBy,
    },
  })

  const result = await persistRuntimeEvent(event)
  if (!result.persisted) {
    throw new Error(result.error ?? 'Failed to archive ShowTELA.')
  }

  return {
    workspaceId: input.workspaceId,
    showTelaId: input.showTelaId,
    archivedAt: event.createdAt,
  }
}

export async function registerShowTelaRename(input: {
  workspaceId: string
  showTelaName: string
  renamedBy?: string
}) {
  const event = createRuntimeEvent<ShowTelaRenamedPayload>({
    workspaceId: input.workspaceId,
    type: SHOWTELA_RENAMED_EVENT_TYPE,
    payloadType: SHOWTELA_LIFECYCLE_PAYLOAD_TYPE,
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {
      showTelaName: normalizeShowTelaName(input.showTelaName),
      renamedBy: input.renamedBy,
    },
  })

  const result = await persistRuntimeEvent(event)
  if (!result.persisted) {
    throw new Error(result.error ?? 'Failed to rename ShowTELA.')
  }

  return {
    workspaceId: input.workspaceId,
    showTelaName: normalizeShowTelaName(input.showTelaName),
    renamedAt: event.createdAt,
  }
}

const WORKSPACE_SCOPED_TABLES = [
  'runtime_events',
  'durable_artifacts',
  'durable_entities',
  'durable_snapshots',
  'operational_states',
  'production_riders',
  'venue_entities',
  'venue_assessments',
  'readiness_reviews',
  'operational_objects',
] as const

export async function deleteShowTela(workspaceId: string): Promise<{ deleted: Record<string, number> }> {
  const supabase = getSupabaseServerClient()
  const deleted: Record<string, number> = {}

  for (const table of WORKSPACE_SCOPED_TABLES) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error(`[deleteShowTela] failed on ${table}:`, error.message)
    } else {
      deleted[table] = count ?? 0
    }
  }

  return { deleted }
}

export async function verifyCleanShowTela(workspaceId: string): Promise<ShowTelaBuildVerification> {
  const [durable, events, hydrated] = await Promise.all([
    loadDurableContinuity(workspaceId),
    getAllReplayEventsForWorkspace(workspaceId),
    hydrateRuntime(workspaceId),
  ])

  const vm = buildShowTelaVMFromHydratedState(hydrated)

  return {
    people: vm.activeOps.length,
    operations: vm.crusadeOperations.length,
    calendar: vm.calendarEvents?.length ?? 0,
    artifacts: durable.artifacts.length,
    events: events.length,
    continuity: vm.feed.length,
  }
}

export function isCleanShowTela(verification: ShowTelaBuildVerification) {
  return (
    verification.people === 0 &&
    verification.operations === 0 &&
    verification.calendar === 0 &&
    verification.artifacts === 0 &&
    verification.events === 0 &&
    verification.continuity === 0
  )
}

async function listShowTelaRegistry(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data: createdData, error: createdError } = await supabase
    .from('runtime_events')
    .select('id, workspace_id, created_at, payload')
    .eq('type', SHOWTELA_CREATED_EVENT_TYPE)
    .order('created_at', { ascending: false })
    .limit(200)

  if (createdError) {
    throw new Error(`listShowTelas: ${createdError.message}`)
  }

  const createdRows = (createdData ?? []) as ShowTelaCreatedEventRow[]
  const workspaceIds = Array.from(new Set(createdRows.map((row) => row.workspace_id).filter(Boolean)))
  if (workspaceIds.length === 0) {
    return { active: [], archived: [] }
  }

  return buildRegistryForWorkspace(supabase, workspaceIds, createdRows)
}

async function buildRegistryForWorkspace(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  workspaceIds: string | string[],
  createdRows?: ShowTelaCreatedEventRow[],
) {
  const workspaceIdList = Array.isArray(workspaceIds) ? workspaceIds : [workspaceIds]

  const [
    { data: activityData, error: activityError },
    { data: archivedData, error: archivedError },
    { data: renamedData, error: renamedError },
    freshCreatedRows,
  ] = await Promise.all([
    supabase
      .from('runtime_events')
      .select('workspace_id, created_at')
      .in('workspace_id', workspaceIdList)
      .order('created_at', { ascending: false })
      .limit(4000),
    supabase
      .from('runtime_events')
      .select('workspace_id, created_at, payload')
      .eq('type', SHOWTELA_ARCHIVED_EVENT_TYPE)
      .in('workspace_id', workspaceIdList)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('runtime_events')
      .select('workspace_id, created_at, payload')
      .eq('type', SHOWTELA_RENAMED_EVENT_TYPE)
      .in('workspace_id', workspaceIdList)
      .order('created_at', { ascending: false })
      .limit(500),
    createdRows
      ? Promise.resolve(createdRows)
      : supabase
          .from('runtime_events')
          .select('id, workspace_id, created_at, payload')
          .eq('type', SHOWTELA_CREATED_EVENT_TYPE)
          .in('workspace_id', workspaceIdList)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error) throw new Error(`resolveShowTela created rows: ${error.message}`)
            return (data ?? []) as ShowTelaCreatedEventRow[]
          }),
  ])

  if (activityError) {
    throw new Error(`showTela activity: ${activityError.message}`)
  }

  if (archivedError) {
    throw new Error(`showTela archive status: ${archivedError.message}`)
  }

  if (renamedError) {
    console.warn(`showTela rename lookup: ${renamedError.message}`)
  }

  return buildShowTelaRegistry(
    freshCreatedRows,
    (activityData ?? []) as ShowTelaActivityRow[],
    (archivedData ?? []) as ShowTelaArchivedEventRow[],
    normalizeShowTelaName,
    (renamedData ?? []) as ShowTelaRenamedEventRow[],
  )
}
