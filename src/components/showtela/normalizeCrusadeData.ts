import type { NormalizeFn } from './viewModels';
import type { OperationalContinuityObject } from './types';

const fallbackImage = 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=900&auto=format&fit=crop'

function toTimestamp(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' AM', 'A').replace(' PM', 'P');
  return `${weekday} ${time} ${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

export const normalizeCrusadeData: NormalizeFn = ({ feed }) => {
  const unresolvedCount = feed.filter((i) => !i.status || i.status.toLowerCase() !== 'resolved').length;
  const overdueCount = feed.filter((i) => (i.priority || '').toLowerCase().includes('high')).length;
  const blockedCount = feed.filter((i) => (i.summary || '').toLowerCase().includes('blocked')).length;

  const runtimeTimeline = feed.slice(0, 15).map((item, idx) => ({
    id: `timeline-${item.id}`,
    timestamp: toTimestamp(item.updated),
    actor: item.owner || 'Operations',
    summary: item.summary || item.title,
    continuityObjectId: item.id,
    pressureDelta: ((item.priority || '').toLowerCase().includes('high') ? 1 : 0) - (idx > 0 && (feed[idx - 1]?.priority || '').toLowerCase().includes('high') ? 1 : 0),
  }))

  const continuityObjects: OperationalContinuityObject[] = feed.map((item) => ({
    id: `continuity-${item.id}`,
    type: 'continuity_event',
    title: item.title,
    status: item.status || 'active',
    timestamp: item.updated,
    priority: item.priority || 'medium',
    owner: item.owner || 'Ops Lead',
    unresolvedCount: !item.status || item.status.toLowerCase() !== 'resolved' ? 1 : 0,
    linkedPeople: [item.owner || 'Ops Lead'],
    sourcePage: 'CST continuity feed',
    emotionalWeight: (item.priority || '').toLowerCase().includes('high') ? 0.85 : 0.5,
    continuitySummary: item.summary || item.title,
    operationalImportance: (item.priority || '').toLowerCase().includes('high') ? 9 : 6,
    recencyScore: Math.max(1, 10 - Math.floor((Date.now() - new Date(item.updated || Date.now()).getTime()) / (1000 * 60 * 60 * 6))),
    unresolvedImpact: !item.status || item.status.toLowerCase() !== 'resolved' ? 8 : 3,
  }))

  const uniqueOwners = Array.from(new Set(feed.map((item) => item.owner).filter(Boolean))) as string[]
  const activeOps = uniqueOwners.slice(0, 12).map((name, idx) => ({
    id: `owner-${idx}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    unresolvedCount: feed.filter((i) => i.owner === name && (!i.status || i.status.toLowerCase() !== 'resolved')).length,
    latest: toTimestamp(feed.find((i) => i.owner === name)?.updated),
    image: fallbackImage,
  }))

  const operations = Array.from(new Set(feed.map((i) => i.priority || 'Unspecified'))).map((label, idx) => ({
    id: `op-${idx}-${label.toLowerCase()}`,
    name: label,
    label,
    latest: 'Live CST source',
    unresolvedCount: feed.filter((i) => (i.priority || 'Unspecified') === label && (!i.status || i.status.toLowerCase() !== 'resolved')).length,
    image: fallbackImage,
  }))

  return {
    activeOps,
    fluencyPartners: [],
    crusadeOperations: operations,
    unresolvedPressure: { unresolvedCount, overdueCount, blockedCount, pendingApprovals: Math.max(0, Math.floor(unresolvedCount / 2)) },
    feed: continuityObjects.map((item) => ({
      id: item.id,
      timestamp: toTimestamp(item.timestamp),
      title: item.title,
      summary: item.continuitySummary,
      owner: item.owner,
      image: fallbackImage,
      avatar: fallbackImage,
      unresolved: item.unresolvedImpact >= 6,
      lastContactAt: item.timestamp,
      unresolvedDependencies: item.unresolvedImpact >= 6 ? ['approval pending'] : [],
      linkedEntities: item.linkedPeople,
      linkedThreads: [item.id],
      attachments: [],
    })),
    continuityObjects,
    runtimeTimeline,
  };
};
