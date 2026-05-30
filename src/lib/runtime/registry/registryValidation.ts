import {
  CONSTITUTIONAL_SYSTEM_IDS,
  MODULE_RUNTIME_CLASSES,
  REGISTRY_AUDIT_LEVELS,
  REGISTRY_AUTHORITY_LEVELS,
  REGISTRY_MODULE_STATES,
  REGISTRY_ROLLBACK_LEVELS,
  REGISTRY_RUNTIME_CLASS,
  REGISTRY_SCHEMA_VERSION,
  type RegistryModule,
  type RegistryValidationIssue,
  type RegistryValidationResult,
  type RuntimeRegistryDocument,
} from './registryTypes'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function moduleIssue(moduleId: string, code: string, message: string): RegistryValidationIssue {
  return { code, message: `${moduleId}: ${message}` }
}

function validateModuleShape(module: unknown, index: number): RegistryValidationIssue[] {
  if (!isRecord(module)) {
    return [{ code: 'module.invalid-shape', message: `modules[${index}] must be an object` }]
  }

  const issues: RegistryValidationIssue[] = []
  const moduleId = typeof module.id === 'string' ? module.id : `modules[${index}]`

  if (typeof module.id !== 'string' || module.id.length === 0) issues.push(moduleIssue(moduleId, 'module.id.invalid', 'id must be a non-empty string'))
  if (typeof module.label !== 'string' || module.label.length === 0) issues.push(moduleIssue(moduleId, 'module.label.invalid', 'label must be a non-empty string'))
  if (!MODULE_RUNTIME_CLASSES.includes(module.runtimeClass as never)) issues.push(moduleIssue(moduleId, 'module.runtimeClass.invalid', 'runtimeClass must be operator or constitutional-system'))
  if (typeof module.domain !== 'string' || module.domain.length === 0) issues.push(moduleIssue(moduleId, 'module.domain.invalid', 'domain must be a non-empty string'))
  if (!REGISTRY_AUTHORITY_LEVELS.includes(module.authorityLevel as never)) issues.push(moduleIssue(moduleId, 'module.authority.invalid', 'authorityLevel is malformed'))
  if (!REGISTRY_ROLLBACK_LEVELS.includes(module.rollbackLevel as never)) issues.push(moduleIssue(moduleId, 'module.rollback.invalid', 'rollbackLevel is illegal'))
  if (!REGISTRY_AUDIT_LEVELS.includes(module.auditLevel as never)) issues.push(moduleIssue(moduleId, 'module.audit.invalid', 'auditLevel is invalid'))
  if (typeof module.activeStatus !== 'boolean') issues.push(moduleIssue(moduleId, 'module.activeStatus.invalid', 'activeStatus must be boolean'))
  if (!REGISTRY_MODULE_STATES.includes(module.moduleHealth as never)) issues.push(moduleIssue(moduleId, 'module.health.invalid', 'moduleHealth is invalid'))
  if (!REGISTRY_MODULE_STATES.includes(module.moduleStatus as never)) issues.push(moduleIssue(moduleId, 'module.status.invalid', 'moduleStatus is invalid'))
  if (!isStringArray(module.allowedActions)) issues.push(moduleIssue(moduleId, 'module.allowedActions.invalid', 'allowedActions must be a string array'))
  if (!isStringArray(module.restrictedActions)) issues.push(moduleIssue(moduleId, 'module.restrictedActions.invalid', 'restrictedActions must be a string array'))
  if (!isStringArray(module.governanceStates)) issues.push(moduleIssue(moduleId, 'module.governanceStates.invalid', 'governanceStates must be a string array'))
  if (!isStringArray(module.escalationTargets)) issues.push(moduleIssue(moduleId, 'module.escalationTargets.invalid', 'escalationTargets must be a string array'))

  return issues
}

function validateModuleLegality(module: RegistryModule): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = []
  const restricted = new Set(module.restrictedActions)

  for (const action of module.allowedActions) {
    if (restricted.has(action)) {
      issues.push(moduleIssue(module.id, 'module.action-overlap.invalid', `allowedActions and restrictedActions overlap on ${action}`))
    }
  }

  if (module.runtimeClass === 'constitutional-system') {
    if (!CONSTITUTIONAL_SYSTEM_IDS.includes(module.id as never)) {
      issues.push(moduleIssue(module.id, 'module.constitutional.unknown', 'constitutional modules must use canonical constitutional IDs'))
    }
    if (module.authorityLevel !== 'S4') {
      issues.push(moduleIssue(module.id, 'module.constitutional.authority', 'constitutional systems must carry S4 authority'))
    }
    if (module.rollbackLevel !== 'none') {
      issues.push(moduleIssue(module.id, 'module.constitutional.rollback', 'constitutional systems must not declare rollback capability'))
    }
    if (module.auditLevel !== 'sovereign') {
      issues.push(moduleIssue(module.id, 'module.constitutional.audit', 'constitutional systems must use sovereign audit level'))
    }
  }

  if (module.runtimeClass === 'operator' && CONSTITUTIONAL_SYSTEM_IDS.includes(module.id as never)) {
    issues.push(moduleIssue(module.id, 'module.constitutional.operator-ambiguity', 'constitutional systems cannot be classified as operators'))
  }

  if ((module.moduleStatus === 'disabled' || module.moduleStatus === 'quarantined' || module.moduleStatus === 'deprecated') && module.activeStatus) {
    issues.push(moduleIssue(module.id, 'module.activeStatus.inconsistent', 'inactive lifecycle states must not report activeStatus=true'))
  }

  if (module.moduleStatus === 'active' && module.moduleHealth === 'quarantined') {
    issues.push(moduleIssue(module.id, 'module.health.inconsistent', 'active modules cannot report quarantined health'))
  }

  return issues
}

export function validateRegistryDocument(input: unknown): RegistryValidationResult {
  const issues: RegistryValidationIssue[] = []

  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'registry.invalid-shape', message: 'registry document must be an object' }] }
  }

  if (input.runtimeClass !== REGISTRY_RUNTIME_CLASS) {
    issues.push({ code: 'registry.runtimeClass.invalid', message: 'runtimeClass must be governed-runtime-topology' })
  }
  if (input.schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    issues.push({ code: 'registry.schemaVersion.invalid', message: `schemaVersion must be ${REGISTRY_SCHEMA_VERSION}` })
  }
  if (typeof input.registryVersion !== 'string' || input.registryVersion.length === 0) {
    issues.push({ code: 'registry.registryVersion.invalid', message: 'registryVersion must be a non-empty string' })
  }
  if (typeof input.generatedAt !== 'string' || Number.isNaN(Date.parse(input.generatedAt))) {
    issues.push({ code: 'registry.generatedAt.invalid', message: 'generatedAt must be an ISO-compatible timestamp' })
  }
  if (!Array.isArray(input.modules)) {
    issues.push({ code: 'registry.modules.invalid', message: 'modules must be an array' })
    return { ok: false, issues }
  }

  input.modules.forEach((module, index) => {
    issues.push(...validateModuleShape(module, index))
  })

  const typedModules = input.modules.filter(isRecord) as RegistryModule[]
  const seenIds = new Set<string>()
  for (const registryModule of typedModules) {
    if (seenIds.has(registryModule.id)) {
      issues.push(moduleIssue(registryModule.id, 'module.duplicate-id', 'duplicate module IDs are not allowed'))
    }
    seenIds.add(registryModule.id)
    issues.push(...validateModuleLegality(registryModule))
  }

  for (const constitutionalId of CONSTITUTIONAL_SYSTEM_IDS) {
    const registryModule = typedModules.find((candidate) => candidate.id === constitutionalId)
    if (!registryModule) {
      issues.push({ code: 'registry.constitutional.missing', message: `missing constitutional system ${constitutionalId}` })
    } else if (registryModule.runtimeClass !== 'constitutional-system') {
      issues.push(moduleIssue(registryModule.id, 'registry.constitutional.separation', 'constitutional system must not be loaded as an operator'))
    }
  }

  return { ok: issues.length === 0, issues }
}

export function assertValidRegistryDocument(input: unknown): asserts input is RuntimeRegistryDocument {
  const result = validateRegistryDocument(input)
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => `${issue.code}: ${issue.message}`).join('\n'))
  }
}
