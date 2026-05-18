import type { NormalizeFn } from './viewModels';
import type { OperationalContinuityObject } from './types';

const feedImages = [
  'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?q=80&w=900&auto=format&fit=crop',
];

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
    pressureDelta: (((item.priority || '').toLowerCase().includes('high') ? 1 : 0) - (idx > 0 && (feed[idx - 1]?.priority || '').toLowerCase().includes('high') ? 1 : 0)) as -2 | -1 | 0 | 1 | 2,
  }))

  const normalizePerson = (item: (typeof feed)[number]): OperationalContinuityObject => ({
    id: `person-${item.id}`,
    type: 'person' as const,
    title: item.owner || 'Operator',
    status: item.status || 'active',
    timestamp: item.updated,
    priority: item.priority || 'medium',
    owner: item.owner || 'Ops Lead',
    unresolvedCount: !item.status || item.status.toLowerCase() !== 'resolved' ? 1 : 0,
    linkedPeople: [item.owner || 'Ops Lead'],
    sourcePage: 'People & Relationship Data Layer',
    emotionalWeight: (item.priority || '').toLowerCase().includes('high') ? 0.85 : 0.5,
    continuitySummary: item.summary || 'Operational relationship continuity update.',
    operationalImportance: (item.priority || '').toLowerCase().includes('high') ? 9 : 6,
    recencyScore: Math.max(1, 10 - Math.floor((Date.now() - new Date(item.updated || Date.now()).getTime()) / (1000 * 60 * 60 * 6))),
    unresolvedImpact: !item.status || item.status.toLowerCase() !== 'resolved' ? 8 : 3,
  })
  const normalizeRisk = (item: (typeof feed)[number]): OperationalContinuityObject => ({ ...normalizePerson(item), id: `risk-${item.id}`, type: 'risk_signal' as const, sourcePage: 'Risk Register', title: `${item.title} risk`, status: item.status || 'elevated' })
  const normalizeContinuityEvent = (item: (typeof feed)[number]): OperationalContinuityObject => ({ ...normalizePerson(item), id: `continuity-${item.id}`, type: 'continuity_event' as const, sourcePage: 'Weekly Ops System', title: item.title })
  const normalizeTouringAssumption = (item: (typeof feed)[number]): OperationalContinuityObject => ({ ...normalizePerson(item), id: `assumption-${item.id}`, type: 'touring_assumption' as const, sourcePage: 'Touring Assumptions Tracker', title: `${item.title} assumption` })
  const normalizeCommunicationEvent = (item: (typeof feed)[number]): OperationalContinuityObject => ({ ...normalizePerson(item), id: `comm-${item.id}`, type: 'communication_event' as const, sourcePage: 'Communication Rhythm', title: `${item.owner || 'Ops'} communication` })

  const continuityObjects = feed.flatMap((item) => [
    normalizePerson(item),
    normalizeRisk(item),
    normalizeContinuityEvent(item),
    normalizeTouringAssumption(item),
    normalizeCommunicationEvent(item),
    { ...normalizePerson(item), id: `op-${item.id}`, type: 'operation' as const, sourcePage: 'CRUSADE OPS HQ', title: item.title },
    { ...normalizePerson(item), id: `unresolved-${item.id}`, type: 'unresolved' as const, sourcePage: 'First 30 Day Activation Tracker', title: `${item.title} unresolved` },
  ])

  const weightedFeed = continuityObjects
    .filter((o) => o.type === 'continuity_event' || o.type === 'risk_signal' || o.type === 'communication_event' || o.type === 'touring_assumption')
    .sort((a, b) => (b.operationalImportance + b.emotionalWeight * 10 + b.recencyScore + b.unresolvedImpact) - (a.operationalImportance + a.emotionalWeight * 10 + a.recencyScore + a.unresolvedImpact))

  return {
    activeOps: [
      { id: 'jon', name: 'Jon', unresolvedCount: 2, latest: 'Sat 6:41P 5/17/26', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300&auto=format&fit=crop' },
      { id: 'juan', name: 'Juan', unresolvedCount: 1, latest: 'Sat 6:13P 5/17/26', image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop' },
      { id: 'mags', name: 'Mags', unresolvedCount: 3, latest: 'Sat 5:52P 5/17/26', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop' },
      { id: 'kristen', name: 'Kristen', unresolvedCount: 1, latest: 'Sat 5:34P 5/17/26', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=300&auto=format&fit=crop' },
    ],
    fluencyPartners: [
      { id: 'lighting', name: 'Lighting', latest: 'Active', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=300&auto=format&fit=crop' },
      { id: 'audio', name: 'Audio', latest: 'Active', unresolvedCount: 2, image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?q=80&w=300&auto=format&fit=crop' },
      { id: 'sm', name: 'Stage Mgmt', latest: 'Active', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?q=80&w=300&auto=format&fit=crop' },
      { id: 'foh', name: 'FOH', latest: 'Active', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=300&auto=format&fit=crop' },
      { id: 'wardrobe', name: 'Wardrobe', latest: 'Active', unresolvedCount: 0, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=300&auto=format&fit=crop' },
    ],
    crusadeOperations: [
      { id: 'travel', name: 'Travel', label: 'Travel', latest: 'Movement active', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?q=80&w=300&auto=format&fit=crop' },
      { id: 'logistics', name: 'Logistics', label: 'Logistics', latest: 'Movement active', unresolvedCount: 2, image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=300&auto=format&fit=crop' },
      { id: 'venues', name: 'Venues', label: 'Venues', latest: 'Movement active', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=300&auto=format&fit=crop' },
      { id: 'hospitality', name: 'Hospitality', label: 'Hospitality', latest: 'Movement active', unresolvedCount: 0, image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=300&auto=format&fit=crop' },
      { id: 'security', name: 'Security', label: 'Security', latest: 'Movement active', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=300&auto=format&fit=crop' },
    ],
    unresolvedPressure: { unresolvedCount, overdueCount, blockedCount, pendingApprovals: Math.max(1, Math.floor(unresolvedCount / 2)) },
    feed: weightedFeed.map((item, i) => ({
      id: item.id,
      timestamp: toTimestamp(item.timestamp),
      title: item.title,
      summary: item.continuitySummary,
      owner: item.owner,
      image: feedImages[i % feedImages.length],
      avatar: feedImages[(i + 1) % feedImages.length],
      unresolved: item.unresolvedImpact >= 6,
      lastContactAt: item.timestamp,
      unresolvedDependencies: item.unresolvedImpact >= 6 ? ['approval pending'] : [],
      linkedEntities: item.linkedPeople,
      linkedThreads: [item.id.replace('continuity-', '')],
      attachments: i % 2 === 0 ? [{ id: `att-${item.id}`, type: 'stage_plot', title: `${item.title} packet`, previewUrl: feedImages[i % feedImages.length] }] : [],
    })),
    continuityObjects,
    runtimeTimeline,
  };
};
