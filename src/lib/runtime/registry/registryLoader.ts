import canonicalRegistryJson from '../../../../public/data/pigpen-v5.2.json'
import lineageRegistryJson from '../../../../public/data/pigpen-v5.1.json'

import {
  CANONICAL_REGISTRY_VERSION,
  LINEAGE_COMPATIBILITY_REGISTRY_VERSION,
  type RegistryAuthorityLevel,
  type RegistryModule,
  type RuntimeRegistryDocument,
} from './registryTypes'
import { assertValidRegistryDocument } from './registryValidation'

function cloneRegistryDocument(input: RuntimeRegistryDocument): RuntimeRegistryDocument {
  return JSON.parse(JSON.stringify(input)) as RuntimeRegistryDocument
}

function freezeRegistryDocument(input: RuntimeRegistryDocument): RuntimeRegistryDocument {
  for (const registryModule of input.modules) {
    Object.freeze(registryModule.allowedActions)
    Object.freeze(registryModule.restrictedActions)
    Object.freeze(registryModule.governanceStates)
    Object.freeze(registryModule.escalationTargets)
    Object.freeze(registryModule)
  }
  Object.freeze(input.modules)
  return Object.freeze(input)
}

function loadValidatedRegistry(input: RuntimeRegistryDocument, expectedVersion: string) {
  const cloned = cloneRegistryDocument(input)
  assertValidRegistryDocument(cloned)
  if (cloned.registryVersion !== expectedVersion) {
    throw new Error(`Registry version mismatch: expected ${expectedVersion}, received ${cloned.registryVersion}`)
  }
  return freezeRegistryDocument(cloned)
}

const CANONICAL_REGISTRY = loadValidatedRegistry(canonicalRegistryJson as RuntimeRegistryDocument, CANONICAL_REGISTRY_VERSION)
const LINEAGE_COMPATIBILITY_REGISTRY = loadValidatedRegistry(lineageRegistryJson as RuntimeRegistryDocument, LINEAGE_COMPATIBILITY_REGISTRY_VERSION)

export function loadCanonicalRegistry(): RuntimeRegistryDocument {
  return CANONICAL_REGISTRY
}

export function loadLineageCompatibilityRegistry(): RuntimeRegistryDocument {
  return LINEAGE_COMPATIBILITY_REGISTRY
}

export function getRegistryModules(): readonly RegistryModule[] {
  return loadCanonicalRegistry().modules
}

export function getActiveModules(): readonly RegistryModule[] {
  return getRegistryModules().filter((module) => module.activeStatus && module.moduleStatus === 'active')
}

export function getConstitutionalSystems(): readonly RegistryModule[] {
  return getRegistryModules().filter((module) => module.runtimeClass === 'constitutional-system')
}

export function getDegradedModules(): readonly RegistryModule[] {
  return getRegistryModules().filter((module) => module.moduleHealth === 'degraded' || module.moduleStatus === 'degraded')
}

export function getQuarantinedModules(): readonly RegistryModule[] {
  return getRegistryModules().filter((module) => module.moduleHealth === 'quarantined' || module.moduleStatus === 'quarantined')
}

export function getAuthorityMappings(): Readonly<Record<string, RegistryAuthorityLevel>> {
  return Object.freeze(
    Object.fromEntries(getRegistryModules().map((module) => [module.id, module.authorityLevel])) as Record<string, RegistryAuthorityLevel>,
  )
}
