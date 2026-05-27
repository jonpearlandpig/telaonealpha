import type { RuntimeEvent } from '../runtimeTypes'
import { loadCanonicalRegistry } from '../registry/registryLoader'

export type RuntimePriorityTier = 'constitutional' | 'governance-critical' | 'operational-critical' | 'observational'

function payloadRecord(event: RuntimeEvent) {
  return event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function derivePriorityTier(event: RuntimeEvent): RuntimePriorityTier {
  if (event.type.startsWith('constitutional.')) return 'constitutional'
  if (event.type === 'operator.blocked' || event.type === 'operator.escalated' || event.type === 'governance.blocked') return 'governance-critical'
  if (event.type === 'operator.invoked' || event.type === 'operator.execution.approved' || event.type === 'operator.execution.completed') return 'operational-critical'
  return 'observational'
}

export function derivePriorityTierForModule(moduleId: string): RuntimePriorityTier {
  const registry = loadCanonicalRegistry()
  const registryModule = registry.modules.find((item) => item.id === moduleId)
  if (!registryModule) return 'observational'
  if (registryModule.runtimeClass === 'constitutional-system') return 'constitutional'
  if (registryModule.auditLevel === 'sovereign' || registryModule.authorityLevel === 'S4') return 'constitutional'
  if (registryModule.authorityLevel === 'S2' || registryModule.authorityLevel === 'S3') return 'governance-critical'
  if (registryModule.authorityLevel === 'S1' || registryModule.authorityLevel === 'S0') return 'operational-critical'
  return 'observational'
}

export function derivePriorityReason(event: RuntimeEvent) {
  const payload = payloadRecord(event)
  const operatorId = stringValue(payload.operatorId)
  if (operatorId) return `${operatorId} resolved to ${derivePriorityTierForModule(operatorId)}`
  return `${event.type} resolved to ${derivePriorityTier(event)}`
}
