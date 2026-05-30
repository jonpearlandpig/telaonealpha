import type { RegistryMetadata, RuntimeRegistryDocument } from './registryTypes'
import { loadCanonicalRegistry } from './registryLoader'

export function buildRegistryMetadata(registry: RuntimeRegistryDocument = loadCanonicalRegistry()): RegistryMetadata {
  return {
    registryVersion: registry.registryVersion,
    schemaVersion: registry.schemaVersion,
    generatedAt: registry.generatedAt,
    operatorCount: registry.modules.filter((module) => module.runtimeClass === 'operator').length,
    constitutionalSystemCount: registry.modules.filter((module) => module.runtimeClass === 'constitutional-system').length,
    activeModuleCount: registry.modules.filter((module) => module.moduleStatus === 'active').length,
    degradedModuleCount: registry.modules.filter((module) => module.moduleStatus === 'degraded').length,
    quarantinedModuleCount: registry.modules.filter((module) => module.moduleStatus === 'quarantined').length,
  }
}
