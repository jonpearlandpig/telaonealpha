import type { NormalizeFn } from './viewModels';

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

  return {
    activeOps: [
      { id: 'jon', name: 'Jon', unresolvedCount: 2, latest: 'Sat 6:41P 5/17/26', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300&auto=format&fit=crop' },
      { id: 'juan', name: 'Juan', unresolvedCount: 1, latest: 'Sat 6:13P 5/17/26', image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop' },
      { id: 'mags', name: 'Mags', unresolvedCount: 3, latest: 'Sat 5:52P 5/17/26', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop' },
      { id: 'kristen', name: 'Kristen', unresolvedCount: 1, latest: 'Sat 5:34P 5/17/26', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=300&auto=format&fit=crop' },
    ],
    fluencyPartners: [
      { id: 'lighting', label: 'Lighting', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=300&auto=format&fit=crop' },
      { id: 'audio', label: 'Audio', unresolvedCount: 2, image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?q=80&w=300&auto=format&fit=crop' },
      { id: 'sm', label: 'Stage Mgmt', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?q=80&w=300&auto=format&fit=crop' },
      { id: 'foh', label: 'FOH', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=300&auto=format&fit=crop' },
      { id: 'wardrobe', label: 'Wardrobe', unresolvedCount: 0, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=300&auto=format&fit=crop' },
    ],
    crusadeOperations: [
      { id: 'travel', label: 'Travel', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?q=80&w=300&auto=format&fit=crop' },
      { id: 'logistics', label: 'Logistics', unresolvedCount: 2, image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=300&auto=format&fit=crop' },
      { id: 'venues', label: 'Venues', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=300&auto=format&fit=crop' },
      { id: 'hospitality', label: 'Hospitality', unresolvedCount: 0, image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=300&auto=format&fit=crop' },
      { id: 'security', label: 'Security', unresolvedCount: 1, image: 'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=300&auto=format&fit=crop' },
    ],
    unresolvedPressure: { unresolvedCount, overdueCount, blockedCount, pendingApprovals: Math.max(1, Math.floor(unresolvedCount / 2)) },
    feed: feed.map((item, i) => ({
      id: item.id,
      timestamp: toTimestamp(item.updated),
      title: item.title,
      summary: item.summary || 'Operational continuity update received.',
      owner: item.owner || 'Ops Lead',
      image: feedImages[i % feedImages.length],
      avatar: feedImages[(i + 1) % feedImages.length],
      unresolved: !item.status || item.status.toLowerCase() !== 'resolved',
    })),
  };
};
