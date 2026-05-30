import { getAuthorityMappings, loadCanonicalRegistry } from './registryLoader'
import type { RuntimeRegistryDocument, RuntimeTopologyInspection } from './registryTypes'

export function inspectRuntimeTopology(registry: RuntimeRegistryDocument = loadCanonicalRegistry()): RuntimeTopologyInspection {
  return {
    registryVersion: registry.registryVersion,
    schemaVersion: registry.schemaVersion,
    modules: registry.modules,
    constitutionalSystems: registry.modules.filter((module) => module.runtimeClass === 'constitutional-system'),
    degradedModules: registry.modules.filter((module) => module.moduleStatus === 'degraded' || module.moduleHealth === 'degraded'),
    authorityMappings: getAuthorityMappings(),
    legalActionsByModule: Object.freeze(
      Object.fromEntries(registry.modules.map((module) => [module.id, Object.freeze([...module.allowedActions])])) as Record<string, readonly string[]>,
    ),
    escalationTargetsByModule: Object.freeze(
      Object.fromEntries(registry.modules.map((module) => [module.id, Object.freeze([...module.escalationTargets])])) as Record<string, readonly string[]>,
    ),
  }
}

export function getModulesForAction(action: string, registry: RuntimeRegistryDocument = loadCanonicalRegistry()) {
  return registry.modules.filter((module) => module.allowedActions.includes(action))
}
