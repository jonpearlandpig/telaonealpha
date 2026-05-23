import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createConstitutionalLineageHash } from './hash'
import {
  CONSTITUTIONAL_EVENT_TYPES,
  DECISION_STATES,
  EXECUTION_STATES,
  GOVERNANCE_STATES,
  type ConstitutionalEvent,
  type CreateConstitutionalEventInput,
} from './types'

const SCHEMA_VERSION = 'v1'

type UnsafePayload = CreateConstitutionalEventInput & {
  lineage_hash?: string
  id?: string
  created_at?: string
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringArray(value: unknown, name: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${name} must be an array of strings`)
  }
  return value
}

function optionalRecord(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined) return {}
  if (!isPlainRecord(value)) throw new Error(`${name} must be an object`)
  return value
}

function optionalText(value: unknown, name: string) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new Error(`${name} must be a string`)
  return value
}

function optionalBoolean(value: unknown, name: string, fallback: boolean) {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new Error(`${name} must be boolean`)
  return value
}

function optionalNumber(value: unknown, name: string) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${name} must be numeric`)
  return value
}

function requireMember<T extends string>(value: unknown, allowed: T[], name: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`Invalid ${name}`)
  }
  return value as T
}

function optionalMember<T extends string>(value: unknown, allowed: T[], name: string): T | null {
  if (value === undefined || value === null) return null
  return requireMember(value, allowed, name)
}

export function validateConstitutionalEventPayload(payload: unknown): CreateConstitutionalEventInput {
  if (!isPlainRecord(payload)) throw new Error('Payload must be an object')
  const unsafe = payload as UnsafePayload
  if ('lineage_hash' in unsafe || 'id' in unsafe || 'created_at' in unsafe) {
    throw new Error('Client-controlled lineage fields are not accepted')
  }

  return {
    event_type: requireMember(unsafe.event_type, CONSTITUTIONAL_EVENT_TYPES, 'event_type'),
    parent_event_id: optionalText(unsafe.parent_event_id, 'parent_event_id'),
    title: optionalText(unsafe.title, 'title'),
    summary: optionalText(unsafe.summary, 'summary'),
    human_actor: optionalText(unsafe.human_actor, 'human_actor'),
    operator_overlays: stringArray(unsafe.operator_overlays, 'operator_overlays'),
    governance_state: optionalMember(unsafe.governance_state, GOVERNANCE_STATES, 'governance_state'),
    execution_state: optionalMember(unsafe.execution_state, EXECUTION_STATES, 'execution_state'),
    decision_state: optionalMember(unsafe.decision_state, DECISION_STATES, 'decision_state'),
    continuity_refs: stringArray(unsafe.continuity_refs, 'continuity_refs'),
    model_participants: stringArray(unsafe.model_participants, 'model_participants'),
    routing_metadata: optionalRecord(unsafe.routing_metadata, 'routing_metadata'),
    confidence_score: optionalNumber(unsafe.confidence_score, 'confidence_score'),
    reversible: optionalBoolean(unsafe.reversible, 'reversible', true),
    metadata: optionalRecord(unsafe.metadata, 'metadata'),
  }
}

export async function createConstitutionalEvent(payload: CreateConstitutionalEventInput): Promise<ConstitutionalEvent> {
  const supabase = getSupabaseServerClient()
  let parent: Partial<ConstitutionalEvent> | null = null

  if (payload.parent_event_id) {
    const { data, error } = await supabase
      .from('constitutional_events')
      .select('id, governance_state, execution_state, decision_state, continuity_refs, operator_overlays, routing_metadata')
      .eq('id', payload.parent_event_id)
      .maybeSingle()

    if (error) throw new Error(`Parent event lookup failed: ${error.message}`)
    if (!data) throw new Error('Parent event not found')
    parent = data as Partial<ConstitutionalEvent>
  }

  const timestamp = new Date().toISOString()
  const insertPayload = {
    created_at: timestamp,
    event_version: 1,
    schema_version: SCHEMA_VERSION,
    event_type: payload.event_type,
    parent_event_id: payload.parent_event_id ?? null,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    human_actor: payload.human_actor ?? null,
    operator_overlays: payload.operator_overlays?.length ? payload.operator_overlays : parent?.operator_overlays ?? [],
    governance_state: payload.governance_state ?? parent?.governance_state ?? null,
    execution_state: payload.execution_state ?? parent?.execution_state ?? null,
    decision_state: payload.decision_state ?? parent?.decision_state ?? null,
    continuity_refs: payload.continuity_refs?.length ? payload.continuity_refs : parent?.continuity_refs ?? [],
    model_participants: payload.model_participants ?? [],
    routing_metadata: Object.keys(payload.routing_metadata ?? {}).length ? payload.routing_metadata : parent?.routing_metadata ?? {},
    confidence_score: payload.confidence_score ?? null,
    reversible: payload.reversible ?? true,
    metadata: payload.metadata ?? {},
  }

  const lineage_hash = createConstitutionalLineageHash({
    parent_event_id: insertPayload.parent_event_id,
    governance_state: insertPayload.governance_state,
    operator_overlays: insertPayload.operator_overlays,
    execution_state: insertPayload.execution_state,
    routing_metadata: insertPayload.routing_metadata,
    continuity_refs: insertPayload.continuity_refs,
    schema_version: insertPayload.schema_version,
    timestamp,
  })

  const { data, error } = await supabase
    .from('constitutional_events')
    .insert({ ...insertPayload, lineage_hash })
    .select('*')
    .single()

  if (error) throw new Error(`Constitutional event insert failed: ${error.message}`)
  return data as ConstitutionalEvent
}
