import type { ShowTelaHomeData } from './types'
import type { ShowTelaViewModel } from '@/components/showtela/types'

export function buildShowTelaVM(data: ShowTelaHomeData): ShowTelaViewModel {
  return {
    activeOps: data.activeOps.map(p => ({
      id: p.id,
      name: p.name === 'TBD' ? (p.role ?? 'TBD') : p.name,
      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
    })),
    fluencyPartners: data.fluencyPartners.map(p => ({
      id: p.id,
      name: p.name === 'TBD' ? (p.role ?? 'TBD') : p.name,
      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
      label: p.role ?? '',
    })),
    crusadeOperations: data.operations.map(o => ({
      id: o.id,
      name: o.title,
      label: o.title,
      image: '',
      latest: o.latestMovement ?? '',
      unresolvedCount: o.unresolvedCount ?? 0,
    })),
    unresolvedPressure: {
      unresolvedCount: data.unresolved.length,
      overdueCount: data.unresolved.filter(u => u.severity === 'high').length,
      blockedCount: data.unresolved.filter(u => u.blocking).length,
      pendingApprovals: data.unresolved.filter(u => u.severity === 'medium').length,
    },
    unresolved: data.unresolved.map(u => ({
      id: u.id,
      title: u.title,
      severity: u.severity,
      blocking: u.blocking,
      operation: u.operation,
      aging: u.aging,
    })),
    feed: data.continuityFeed.map(e => ({
      id: e.id,
      timestamp: e.timestamp ?? '',
      title: e.headline,
      summary: e.body ?? '',
      owner: e.owner?.name ?? '',
      image: e.image ?? '',
      avatar: '',
      unresolved: e.isNew ?? false,
      linkedEntities: e.tags ?? [],
      pressure: e.pressure,
    })),
    continuityObjects: [],
    runtimeTimeline: data.runtimeTimeline,
    source: data.source,
    diagnosticState: data.diagnosticState,
    hydration: data.hydration,
    runtimeSnapshotMeta: data.runtimeSnapshotMeta,
  }
}
