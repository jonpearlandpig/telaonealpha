import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { buildOperationalProjectionForWorkspace } from './buildOperationalProjection'
import type { OperationalProjection, OperationalStateRecord, PersistedOperationalStateRow } from './model'

function rowFromState(projection: OperationalProjection, state: OperationalStateRecord) {
  return {
    state_id: state.stateId,
    entity_id: state.entityId,
    entity_type: state.entityType,
    entity_name: state.entityName,
    state_code: state.stateCode,
    state_label: state.stateLabel,
    state_emoji: state.stateEmoji,
    severity: state.severity,
    lifecycle_state: state.lifecycle,
    trigger_detail: state.triggerDetail,
    resolution_action: state.resolutionAction ?? null,
    resolution_owner: state.resolutionOwner ?? null,
    dependency_ids: state.dependencyIds,
    dependency_chain: state.dependencyChain,
    reasoning_chain: state.reasoningChain,
    derivation_source: state.derivationSource,
    workspace_id: projection.workspaceId,
    show_id: projection.showId,
    is_active: true,
    state_entered_at: state.derivedAt,
    state_updated_at: state.derivedAt,
    derivation_version: state.derivationVersion,
    derived_at: state.derivedAt,
    explanation: state.explanation ?? null,
    source_event_ids: state.sourceEventIds ?? [],
    trace_id: state.traceId ?? null,
    projection_version: projection.projectionVersion,
    lineage_ids: state.lineageIds ?? [],
  }
}

function stateFromRow(row: PersistedOperationalStateRow): OperationalStateRecord {
  return {
    stateId: row.state_id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    entityName: row.entity_name,
    stateCode: row.state_code,
    stateLabel: row.state_label,
    stateEmoji: row.state_emoji ?? '',
    severity: row.severity,
    lifecycle: row.lifecycle_state,
    triggerDetail: row.trigger_detail,
    resolutionAction: row.resolution_action ?? undefined,
    resolutionOwner: row.resolution_owner ?? undefined,
    dependencyIds: row.dependency_ids ?? [],
    dependencyChain: row.dependency_chain ?? [],
    reasoningChain: row.reasoning_chain ?? [],
    derivationSource: (row.derivation_source as OperationalStateRecord['derivationSource']) ?? 'runtime-events',
    explanation: row.explanation ?? undefined,
    sourceEventIds: row.source_event_ids ?? [],
    traceId: row.trace_id ?? undefined,
    lineageIds: row.lineage_ids ?? [],
    derivedAt: row.derived_at,
    derivationVersion: row.derivation_version,
  }
}

export async function persistOperationalProjection(projection: OperationalProjection): Promise<void> {
  try {
    const supabase = getSupabaseServerClient()
    await supabase
      .from('operational_states')
      .update({ is_active: false })
      .eq('workspace_id', projection.workspaceId)
      .eq('show_id', projection.showId)
      .eq('is_active', true)

    if (projection.states.length === 0) return

    await supabase.from('operational_states').insert(projection.states.map((state) => rowFromState(projection, state)))
  } catch (error) {
    console.error('[runtime:stateProjectionStore:persist]', error)
  }
}

export async function loadActiveOperationalStates(workspaceId: string, showId = 'crusade'): Promise<OperationalStateRecord[]> {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('operational_states')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('show_id', showId)
      .eq('is_active', true)
      .order('derived_at', { ascending: false })

    if (error) throw new Error(error.message)
    return ((data ?? []) as PersistedOperationalStateRow[]).map(stateFromRow)
  } catch (error) {
    console.error('[runtime:stateProjectionStore:loadActiveOperationalStates]', error)
    return []
  }
}

export async function loadOperationalProjection(workspaceId: string, showId = 'crusade'): Promise<OperationalProjection | null> {
  const states = await loadActiveOperationalStates(workspaceId, showId)
  if (states.length === 0) return null

  const generatedAt = states[0]?.derivedAt ?? new Date().toISOString()
  const blockers = states.filter((state) => state.severity === 'critical' || state.stateCode === 'UNRESOLVED_DEPENDENCY').slice(0, 4)
  const movement = states.filter((state) => state.stateCode === 'ACTIVELY_MOVING').slice(0, 3)
  const readiness = states.filter((state) => state.stateCode === 'READY_TO_ADVANCE').slice(0, 3)
  const escalations = states.filter((state) => state.lifecycle === 'escalated' || state.stateCode === 'ESCALATION_RISK').slice(0, 3)

  return {
    workspaceId,
    showId,
    projectionVersion: states[0]?.derivationVersion ?? 'operational-projection.persisted',
    generatedAt,
    derivedAt: generatedAt,
    derivationVersion: states[0]?.derivationVersion ?? 'operational-state.persisted',
    derivedFromEventCount: states.reduce((sum, state) => sum + (state.sourceEventIds?.length ?? 0), 0),
    states,
    blockers,
    movement,
    readiness,
    escalations,
    dependencyChains: states.map((state) => state.dependencyChain).filter((chain) => chain.length > 0).slice(0, 12),
    groupedTopology: {
      critical: states.filter((state) => state.severity === 'critical').length,
      high: states.filter((state) => state.severity === 'high').length,
      medium: states.filter((state) => state.severity === 'medium').length,
      low: states.filter((state) => state.severity === 'low').length,
      blockers: blockers.length,
      movement: movement.length,
      readiness: readiness.length,
      escalations: escalations.length,
    },
    summary: {
      currentTruth: blockers[0]?.stateLabel ?? 'Operational field is calm.',
      mattersNow: blockers[0]?.explanation ?? movement[0]?.explanation ?? 'No blocker chain has been materialized.',
      nextMovement: readiness[0]?.stateLabel ?? movement[0]?.stateLabel ?? 'Await next runtime movement.',
      blockersLabel: blockers[0]?.stateLabel ?? 'No blocker currently dominates.',
      movementLabel: movement[0]?.stateLabel ?? 'No active movement surfaced.',
      readinessLabel: readiness[0]?.stateLabel ?? 'No ready state surfaced.',
    },
  }
}

export async function getOperationalProjection(workspaceId: string, showId = 'crusade'): Promise<OperationalProjection> {
  const projection = await buildOperationalProjectionForWorkspace(workspaceId, showId)
  persistOperationalProjection(projection).catch(console.error)
  return projection
}
