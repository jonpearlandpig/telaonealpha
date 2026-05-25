import type { ShowTelaHomeData } from './types'
import type { ShowTelaViewModel } from '@/components/showtela/types'

function formatTimestamp(iso?: string) {
  if (!iso) return '—'

  try {
    const date = new Date(iso)
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
    const time = date
      .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(' AM', 'A')
      .replace(' PM', 'P')
    return `${weekday} ${time} ${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`
  } catch {
    return iso
  }
}

export function buildShowTelaVM(data: ShowTelaHomeData): ShowTelaViewModel {
  return {
    activeOps: (data.activeOps ?? []).map((person) => ({
      id: person.id,
      name: person.name === 'TBD' ? person.role ?? 'TBD' : person.name,
      image: person.avatar ?? '',
      latest: person.role ?? '',
      unresolvedCount: person.unresolvedCount ?? 0,
    })),
    fluencyPartners: (data.fluencyPartners ?? []).map((person) => ({
      id: person.id,
      name: person.name === 'TBD' ? person.role ?? 'TBD' : person.name,
      image: person.avatar ?? '',
      latest: person.role ?? '',
      unresolvedCount: person.unresolvedCount ?? 0,
      label: person.role ?? '',
    })),
    crusadeOperations: (data.operations ?? []).map((operation) => ({
      id: operation.id,
      name: operation.title,
      label: operation.title,
      image: '',
      latest: operation.latestMovement ?? '',
      unresolvedCount: operation.unresolvedCount ?? 0,
    })),
    unresolvedPressure: {
      unresolvedCount: data.unresolved.length,
      overdueCount: data.unresolved.filter((item) => item.severity === 'high' || item.severity === 'critical').length,
      blockedCount: data.unresolved.filter((item) => item.blocking).length,
      pendingApprovals: data.unresolved.filter((item) => item.severity === 'medium').length,
    },
    unresolved: data.unresolved.map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      blocking: item.blocking,
      operation: item.operation,
      aging: item.aging,
    })),
    feed: data.continuityFeed.map((event) => ({
      id: event.id,
      timestamp: formatTimestamp(event.timestamp),
      title: event.headline,
      summary: event.summary ?? event.body ?? '',
      rawTranscript: event.rawTranscript,
      owner: event.owner?.name ?? '',
      image: event.image ?? '',
      avatar: '',
      unresolved: event.isNew ?? false,
      pressure: event.pressure,
      classification: event.classification,
      nextActions: event.nextActions,
      confidence: event.confidence,
      waitingOn: event.waitingOn,
      blockedBy: event.blockedBy,
      approvalOwner: event.approvalOwner,
      lastContactAt: event.lastContactAt,
      trustLevel: event.trustLevel,
      operationalRisk: event.operationalRisk,
      unresolvedDependencies: event.unresolvedDependencies,
      linkedEntities: event.linkedEntities ?? event.tags ?? [],
      linkedThreads: event.linkedThreads,
      attachments: (event.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        type: attachment.type,
        title: attachment.title,
        previewUrl: attachment.previewUrl,
      })),
    })),
    continuityObjects: [],
    runtimeTimeline: (data.runtimeTimeline ?? []).map((item) => ({
      ...item,
      timestamp: formatTimestamp(item.timestamp),
    })),
    source: data.source,
  }
}
