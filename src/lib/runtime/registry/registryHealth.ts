import type { RegistryHealthSummary, RuntimeRegistryDocument } from './registryTypes'
import { loadCanonicalRegistry } from './registryLoader'

export function buildRegistryHealthSummary(registry: RuntimeRegistryDocument = loadCanonicalRegistry()): RegistryHealthSummary {
  return {
    active: registry.modules.filter((module) => module.moduleHealth === 'active'),
    degraded: registry.modules.filter((module) => module.moduleHealth === 'degraded'),
    disabled: registry.modules.filter((module) => module.moduleHealth === 'disabled'),
    quarantined: registry.modules.filter((module) => module.moduleHealth === 'quarantined'),
    deprecated: registry.modules.filter((module) => module.moduleHealth === 'deprecated'),
  }
}

export function isModuleHealthy(moduleHealth: RuntimeRegistryDocument['modules'][number]['moduleHealth']) {
  return moduleHealth === 'active'
}
