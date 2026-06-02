/**
 * useTelaActions.ts
 * Parses <<ACTION:{}>> tags from TELA responses and executes
 * governed writes against TELAOne's Supabase schema.
 *
 * Ported from CondoBunk useTelaActions.ts, adapted for TELAOne.
 *
 * HOW IT WORKS:
 *   1. TELA response text may contain <<ACTION:{"type":"...","id":"...","fields":{}}>>
 *   2. parseTelaActions() strips them from display text and returns structured actions
 *   3. Each action renders a TELAActionButton in the UI
 *   4. User taps → signoff modal → executeAction() → Supabase write → change log entry
 *
 * TO ADD A NEW ACTION TYPE:
 *   - Add the type to TelaActionType
 *   - Add a case to executeAction()
 *   - Add a label to getActionLabel()
 */

import { useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TelaActionType =
  | 'resolve_milestone'
  | 'update_show_event'
  | 'create_show_event'
  | 'update_contact'
  | 'create_contact'
  | 'flag_readiness_item'
  | 'resolve_readiness_item'

export interface TelaAction {
  type: TelaActionType
  id: string
  fields?: Record<string, string | number | boolean | null>
  workspace_id?: string
  show_id?: string
}

export interface TelaSignoff {
  reason: string
  affects_safety: boolean
  affects_time: boolean
  affects_money: boolean
}

// ---------------------------------------------------------------------------
// Parser — strips <<ACTION:{}>> from display text, returns actions
// ---------------------------------------------------------------------------

export function parseTelaActions(text: string): {
  cleanText: string
  actions: TelaAction[]
} {
  const actionRegex = /<<ACTION:(.*?)>>/g
  const actions: TelaAction[] = []
  let match

  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.type && parsed.id) {
        actions.push(parsed as TelaAction)
      }
    } catch {
      // skip malformed action tags
    }
  }

  const cleanText = text.replace(/<<ACTION:.*?>>/g, '').trim()
  return { cleanText, actions }
}

export function getActionLabel(action: TelaAction): string {
  switch (action.type) {
    case 'resolve_milestone':       return 'Mark Milestone Complete'
    case 'update_show_event':       return 'Update Show Event'
    case 'create_show_event':       return 'Add Show Event'
    case 'update_contact':          return 'Update Contact'
    case 'create_contact':          return 'Add Contact'
    case 'flag_readiness_item':     return 'Flag Readiness Item'
    case 'resolve_readiness_item':  return 'Resolve Readiness Item'
    default:                        return 'Apply Change'
  }
}

// ---------------------------------------------------------------------------
// Change log writer
// ---------------------------------------------------------------------------

async function logChange(
  workspaceId: string,
  userId: string,
  threadId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  summary: string,
  signoff: TelaSignoff,
  payloadBefore?: unknown,
  payloadAfter?: unknown
) {
  const severity =
    (signoff.affects_safety || signoff.affects_money) ? 'CRITICAL'
    : signoff.affects_time ? 'IMPORTANT'
    : 'INFO'

  const { error } = await supabase.from('tela_change_log').insert({
    workspace_id:   workspaceId,
    user_id:        userId,
    thread_id:      threadId,
    entity_type:    entityType,
    entity_id:      entityId,
    action,
    change_summary: summary,
    change_reason:  signoff.reason,
    severity,
    affects_safety: signoff.affects_safety,
    affects_time:   signoff.affects_time,
    affects_money:  signoff.affects_money,
    payload_before: payloadBefore ?? null,
    payload_after:  payloadAfter ?? null,
  })

  if (error) console.error('[tela_change_log] write error:', error)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTelaActions(
  workspaceId: string,
  userId: string,
  threadId: string | null
) {
  const executeAction = useCallback(
    async (action: TelaAction, signoff: TelaSignoff): Promise<boolean> => {
      try {
        switch (action.type) {

          case 'resolve_milestone': {
            const { data: before } = await supabase
              .from('constitutional_events')
              .select('*')
              .eq('id', action.id)
              .maybeSingle()

            // Constitutional events are append-only — resolution is a new event
            const { error } = await supabase.from('constitutional_events').insert({
              event_type:       'MILESTONE_RESOLVED',
              parent_event_id:  action.id,
              title:            `Resolved: ${before?.title || action.id}`,
              summary:          signoff.reason,
              human_actor:      userId,
              governance_state: 'RESOLVED',
              execution_state:  'COMPLETE',
              decision_state:   'APPROVED',
              lineage_hash:     `${action.id}-resolved-${Date.now()}`,
              reversible:       false,
            })
            if (error) throw error

            await logChange(
              workspaceId, userId, threadId,
              'constitutional_event', action.id,
              'RESOLVE', `TELA resolved milestone: ${before?.title || action.id}`,
              signoff, before, { resolved: true }
            )

            window.dispatchEvent(new Event('tela-data-changed'))
            return true
          }

          case 'update_show_event': {
            if (!action.fields) throw new Error('No fields to update')

            const { data: before } = await supabase
              .from('constitutional_events')
              .select('*')
              .eq('id', action.id)
              .maybeSingle()

            // Show events in TELAOne are constitutional — updates are new events
            const { error } = await supabase.from('constitutional_events').insert({
              event_type:       'SHOW_EVENT_UPDATED',
              parent_event_id:  action.id,
              title:            `Updated: ${before?.title || action.id}`,
              summary:          signoff.reason,
              human_actor:      userId,
              governance_state: 'ACTIVE',
              execution_state:  'UPDATED',
              decision_state:   'APPROVED',
              metadata:         action.fields,
              lineage_hash:     `${action.id}-update-${Date.now()}`,
              reversible:       true,
            })
            if (error) throw error

            await logChange(
              workspaceId, userId, threadId,
              'constitutional_event', action.id,
              'UPDATE', `TELA updated show event: ${before?.title || action.id}`,
              signoff, before, action.fields
            )

            window.dispatchEvent(new Event('tela-data-changed'))
            return true
          }

          case 'create_show_event': {
            if (!action.fields?.title) throw new Error('title is required')

            const { data: newEvent, error } = await supabase
              .from('constitutional_events')
              .insert({
                event_type:       'SHOW_EVENT_CREATED',
                title:            String(action.fields.title),
                summary:          signoff.reason,
                human_actor:      userId,
                governance_state: 'ACTIVE',
                execution_state:  'PENDING',
                decision_state:   'APPROVED',
                metadata:         action.fields,
                lineage_hash:     `new-show-event-${Date.now()}`,
                reversible:       true,
              })
              .select('id')
              .single()
            if (error) throw error

            await logChange(
              workspaceId, userId, threadId,
              'constitutional_event', (newEvent as { id: string }).id,
              'CREATE', `TELA created show event: ${action.fields.title}`,
              signoff, null, action.fields
            )

            window.dispatchEvent(new Event('tela-data-changed'))
            return true
          }

          case 'flag_readiness_item': {
            if (!action.fields) throw new Error('No fields provided')

            const { data: before } = await supabase
              .from('readiness_reviews')
              .select('*')
              .eq('review_id', action.id)
              .maybeSingle()

            const { error } = await supabase
              .from('readiness_reviews')
              .update({
                status:     action.fields.status || 'RED',
                updated_at: new Date().toISOString(),
              })
              .eq('review_id', action.id)
            if (error) throw error

            await logChange(
              workspaceId, userId, threadId,
              'readiness_review', action.id,
              'UPDATE', `TELA flagged readiness item: ${before?.title || action.id}`,
              signoff, before, action.fields
            )

            window.dispatchEvent(new Event('tela-data-changed'))
            return true
          }

          case 'resolve_readiness_item': {
            const { data: before } = await supabase
              .from('readiness_reviews')
              .select('*')
              .eq('review_id', action.id)
              .maybeSingle()

            const { error } = await supabase
              .from('readiness_reviews')
              .update({
                status:     'GREEN',
                updated_at: new Date().toISOString(),
              })
              .eq('review_id', action.id)
            if (error) throw error

            await logChange(
              workspaceId, userId, threadId,
              'readiness_review', action.id,
              'RESOLVE', `TELA resolved readiness item: ${before?.title || action.id}`,
              signoff, before, { status: 'GREEN' }
            )

            window.dispatchEvent(new Event('tela-data-changed'))
            return true
          }

          default: {
            console.warn('[tela_actions] Unknown action type:', action.type)
            return false
          }
        }
      } catch (err) {
        console.error('[tela_actions] executeAction error:', err)
        return false
      }
    },
    [workspaceId, userId, threadId]
  )

  return { executeAction }
}
