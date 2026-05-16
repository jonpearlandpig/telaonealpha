import type { ContinuityCard, OpsDepartment } from '@/types/feed'

export async function getNotionContinuityFeed(): Promise<ContinuityCard[]> {
  return [
    {
      id: '1',
      type: 'Decision',
      department: 'Executive',
      owner: 'Jon H.',
      timestamp: '4m ago',
      unresolved: true,
      pinned: true,
      headline: 'Nashville credential routing still unresolved',
      summary: 'Security handoff split remains unresolved between touring and venue ops. Assigning ownership now reduces pre-load uncertainty.',
      acknowledged: 9,
      source: 'operationalUpdates',
      sourceLabel: 'Operational Updates',
      tags: ['#routing', '#production'],
      relationship: 'Jon + Production',
    },
    {
      id: '2',
      type: 'Venue Memory',
      department: 'Venue Ops',
      owner: 'Maya R.',
      timestamp: '12m ago',
      unresolved: false,
      headline: 'Dock access changed at south gate',
      summary: 'Updated load-in memory captured with new door code and contact chain. This replaces last week’s stale continuity note.',
      acknowledged: 14,
      source: 'venueNotes',
      sourceLabel: 'Venue Note',
      tags: ['#venueops'],
    },
    {
      id: '3',
      type: 'Staffing Note',
      department: 'Staffing',
      owner: 'Luis P.',
      timestamp: '21m ago',
      unresolved: true,
      headline: 'Merch line lead unassigned for second shift',
      summary: 'Coverage gap persists for 7:00–10:30 PM block. Temporary assignment suggested to stabilize fan-facing operations.',
      acknowledged: 5,
      source: 'staffing',
      sourceLabel: 'Team Directory',
      tags: ['#staffing'],
      relationship: 'Luis + Staffing',
    },
  ]
}

export async function getNotionOpsRail(): Promise<OpsDepartment[]> {
  return [
    { id: 'executive', name: 'Executive', unresolvedCount: 2, active: true, latest: 'Decision 4m', status: 'ACTIVE' },
    { id: 'touring', name: 'Touring', unresolvedCount: 1, active: false, latest: 'Note 10m', status: 'BUILDING' },
    { id: 'production', name: 'Production', unresolvedCount: 0, active: false, latest: 'Update 22m', status: 'ACTIVE' },
    { id: 'venue', name: 'Venue Ops', unresolvedCount: 1, active: true, latest: 'Memory 12m', status: 'EARLY' },
    { id: 'staffing', name: 'Staffing', unresolvedCount: 3, active: true, latest: 'Alert 21m', status: 'ACTIVE' },
    { id: 'marketing', name: 'Marketing', unresolvedCount: 0, active: false, latest: 'Update 36m', status: 'STANDBY' },
    { id: 'finance', name: 'Finance', unresolvedCount: 1, active: false, latest: 'Approval 49m', status: 'EARLY' },
  ]
}
