import { getSupabaseClient } from '@/lib/supabase/client'
import type { ShowTelaViewModel } from '@/components/showtela/types'

export type StateCode =
  | 'WAITING_ON'
  | 'STALE_72_HOURS'
  | 'STALE_24_HOURS'
  | 'ESCALATION_RISK'
  | 'FINANCING_GATE'
  | 'ROUTING_PENDING'
  | 'NEEDS_REVIEW'
  | 'READY_FOR_APPROVAL'
  | 'UNRESOLVED_DEPENDENCY'
  | 'AWAITING_COMMITMENT'
  | 'ACTIVELY_MOVING'

export type OperationalState = {
  entityId: string
  entityType: string
  entityName: string
  stateCode: StateCode
  stateLabel: string
  stateEmoji: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  triggerDetail: string
  resolutionAction?: string
  resolutionOwner?: string
}

export function deriveStatesFromVM(vm: ShowTelaViewModel): OperationalState[] {
  const states: OperationalState[] = []

  for (const person of vm.activeOps) {
    const count = person.unresolvedCount ?? 0
    if (count >= 3) {
      states.push({
        entityId: person.id,
        entityType: 'person',
        entityName: person.name,
        stateCode: 'ESCALATION_RISK',
        stateLabel: `${person.name} — ${count} unresolved`,
        stateEmoji: '🔴',
        severity: 'high',
        triggerDetail: `${count} unresolved items`,
        resolutionAction: `Review ${person.name}'s open items`,
        resolutionOwner: 'Jon Hartman',
      })
    } else if (count >= 1) {
      states.push({
        entityId: person.id,
        entityType: 'person',
        entityName: person.name,
        stateCode: 'NEEDS_REVIEW',
        stateLabel: `${person.name} — ${count} items`,
        stateEmoji: '🟡',
        severity: 'medium',
        triggerDetail: `${count} unresolved items`,
      })
    }
  }

  for (const op of vm.crusadeOperations) {
    const count = op.unresolvedCount ?? 0
    const name = op.name.toLowerCase()

    const isFinancing = ['budget', 'financ', 'payment', 'deposit'].some(k => name.includes(k))
    const isRouting = ['venue', 'routing', 'location', 'city'].some(k => name.includes(k))

    if (isFinancing && count > 0) {
      states.push({
        entityId: op.id,
        entityType: 'operation',
        entityName: op.name,
        stateCode: 'FINANCING_GATE',
        stateLabel: `${op.name} — financing decision needed`,
        stateEmoji: '💰',
        severity: 'high',
        triggerDetail: 'Budget/financing operation has unresolved items',
        resolutionAction: 'Resolve financing gate',
        resolutionOwner: 'Jon Hartman',
      })
    } else if (isRouting && count > 0) {
      states.push({
        entityId: op.id,
        entityType: 'operation',
        entityName: op.name,
        stateCode: 'ROUTING_PENDING',
        stateLabel: `${op.name} — routing not confirmed`,
        stateEmoji: '🗺️',
        severity: 'medium',
        triggerDetail: 'Venue/routing operation has unresolved items',
      })
    } else if (count > 0) {
      states.push({
        entityId: op.id,
        entityType: 'operation',
        entityName: op.name,
        stateCode: 'NEEDS_REVIEW',
        stateLabel: `${op.name} — ${count} unresolved`,
        stateEmoji: '🟡',
        severity: 'medium',
        triggerDetail: `${count} unresolved items`,
      })
    }
  }

  for (const item of vm.unresolved) {
    if (item.blocking) {
      states.push({
        entityId: item.id,
        entityType: 'unresolved',
        entityName: item.title,
        stateCode: 'UNRESOLVED_DEPENDENCY',
        stateLabel: `BLOCKING — ${item.title}`,
        stateEmoji: '⛔',
        severity: 'critical',
        triggerDetail: `Blocking item, aging ${item.aging ?? 0}h`,
        resolutionAction: `Resolve: ${item.title}`,
        resolutionOwner: 'Jon Hartman',
      })
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return states.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))
}

export async function persistStates(states: OperationalState[]): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    await supabase
      .from('operational_states')
      .update({ is_active: false })
      .eq('workspace_id', 'pearlandpig')
      .eq('show_id', 'crusade')
      .eq('is_active', true)

    if (!states.length) return

    await supabase.from('operational_states').insert(
      states.map(s => ({
        entity_id: s.entityId,
        entity_type: s.entityType,
        entity_name: s.entityName,
        state_code: s.stateCode,
        state_label: s.stateLabel,
        state_emoji: s.stateEmoji,
        severity: s.severity,
        trigger_detail: s.triggerDetail,
        resolution_action: s.resolutionAction,
        resolution_owner: s.resolutionOwner,
        workspace_id: 'pearlandpig',
        show_id: 'crusade',
        is_active: true,
      }))
    )
  } catch (err) {
    console.error('[operational-state] persist error:', err)
  }
}
