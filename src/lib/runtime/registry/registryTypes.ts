export const REGISTRY_SCHEMA_VERSION = 'pigpen.registry.v1'
export const CANONICAL_REGISTRY_VERSION = '5.2'
export const LINEAGE_COMPATIBILITY_REGISTRY_VERSION = '5.1'

export const REGISTRY_RUNTIME_CLASS = 'governed-runtime-topology'
export const MODULE_RUNTIME_CLASSES = ['operator', 'constitutional-system'] as const
export const REGISTRY_AUTHORITY_LEVELS = ['S0', 'S1', 'S2', 'S3', 'S4'] as const
export const REGISTRY_ROLLBACK_LEVELS = ['none', 'soft', 'hard'] as const
export const REGISTRY_AUDIT_LEVELS = ['standard', 'elevated', 'sovereign'] as const
export const REGISTRY_MODULE_STATES = ['active', 'degraded', 'disabled', 'quarantined', 'deprecated'] as const
export const REGISTRY_GOVERNANCE_STATES = ['approved', 'blocked', 'escalated', 'pending'] as const
export const CONSTITUTIONAL_SYSTEM_IDS = ['telauthorium', 'pen-and-sword', 'the-ledger'] as const

export type RegistryRuntimeClass = typeof REGISTRY_RUNTIME_CLASS
export type RegistryModuleRuntimeClass = (typeof MODULE_RUNTIME_CLASSES)[number]
export type RegistryAuthorityLevel = (typeof REGISTRY_AUTHORITY_LEVELS)[number]
export type RegistryRollbackLevel = (typeof REGISTRY_ROLLBACK_LEVELS)[number]
export type RegistryAuditLevel = (typeof REGISTRY_AUDIT_LEVELS)[number]
export type RegistryModuleState = (typeof REGISTRY_MODULE_STATES)[number]
export type RegistryGovernanceState = (typeof REGISTRY_GOVERNANCE_STATES)[number]
export type ConstitutionalSystemId = (typeof CONSTITUTIONAL_SYSTEM_IDS)[number]

export type RegistryModule = {
  id: string
  label: string
  runtimeClass: RegistryModuleRuntimeClass
  domain: string
  authorityLevel: RegistryAuthorityLevel
  rollbackLevel: RegistryRollbackLevel
  auditLevel: RegistryAuditLevel
  allowedActions: readonly string[]
  restrictedActions: readonly string[]
  activeStatus: boolean
  moduleHealth: RegistryModuleState
  moduleStatus: RegistryModuleState
  governanceStates: readonly RegistryGovernanceState[]
  escalationTargets: readonly string[]
}

export type RuntimeRegistryDocument = {
  registryVersion: string
  schemaVersion: string
  generatedAt: string
  runtimeClass: RegistryRuntimeClass
  modules: readonly RegistryModule[]
}

export type RegistryValidationIssue = {
  code: string
  message: string
}

export type RegistryValidationResult = {
  ok: boolean
  issues: RegistryValidationIssue[]
}

export type RegistryMetadata = {
  registryVersion: string
  schemaVersion: string
  generatedAt: string
  operatorCount: number
  constitutionalSystemCount: number
  activeModuleCount: number
  degradedModuleCount: number
  quarantinedModuleCount: number
}

export type RegistryHealthSummary = {
  active: RegistryModule[]
  degraded: RegistryModule[]
  disabled: RegistryModule[]
  quarantined: RegistryModule[]
  deprecated: RegistryModule[]
}

export type RuntimeTopologyInspection = {
  registryVersion: string
  schemaVersion: string
  modules: readonly RegistryModule[]
  constitutionalSystems: readonly RegistryModule[]
  degradedModules: readonly RegistryModule[]
  authorityMappings: Readonly<Record<string, RegistryAuthorityLevel>>
  legalActionsByModule: Readonly<Record<string, readonly string[]>>
  escalationTargetsByModule: Readonly<Record<string, readonly string[]>>
}
