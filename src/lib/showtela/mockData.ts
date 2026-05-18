import type { ShowTelaHomeData } from './types'

export const mockShowTelaHomeData: ShowTelaHomeData = {
  activeOps: [
    { id: 'jon', name: 'Jon', role: 'Executive Lead', active: true, unresolvedCount: 2, updatesCount: 4, pressure: 'medium', avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300&auto=format&fit=crop' },
    { id: 'juan', name: 'Juan', role: 'Production', active: true, unresolvedCount: 1, updatesCount: 3, pressure: 'low', avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop' },
    { id: 'mags', name: 'Mags', role: 'Stage Mgmt', active: true, unresolvedCount: 3, updatesCount: 5, pressure: 'high', avatar: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop' },
  ],
  fluencyPartners: [
    { id: 'lighting', name: 'Lighting', role: 'Partner', partner: true, unresolvedCount: 1, updatesCount: 2, pressure: 'medium', avatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=300&auto=format&fit=crop' },
    { id: 'audio', name: 'Audio', role: 'Partner', partner: true, unresolvedCount: 1, updatesCount: 1, pressure: 'low', avatar: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?q=80&w=300&auto=format&fit=crop' },
  ],
  operations: [
    { id: 'travel', title: 'Travel', unresolvedCount: 1, latestMovement: 'Bus call moved +20m', pressure: 'medium' },
    { id: 'logistics', title: 'Logistics', unresolvedCount: 2, latestMovement: 'Dock assignment revised', pressure: 'high' },
    { id: 'venues', title: 'Venues', unresolvedCount: 1, latestMovement: 'Rigging response pending', pressure: 'medium' },
    { id: 'hospitality', title: 'Hospitality', unresolvedCount: 0, latestMovement: 'All clear', pressure: 'low' },
    { id: 'security', title: 'Security', unresolvedCount: 1, latestMovement: 'Credential sweep active', pressure: 'medium' },
  ],
  unresolved: [
    { id: 'u1', title: 'Hershey arena LX trim signoff', severity: 'high', blocking: true, aging: 2, operation: 'Venues' },
    { id: 'u2', title: 'Travel manifest correction', severity: 'medium', blocking: false, aging: 1, operation: 'Travel' },
  ],
  continuityFeed: [
    { id: 'e1', headline: 'Stage plot updated for Hershey', body: 'Juan uploaded v7 with LX trim changes.', timestamp: new Date().toISOString(), tags: ['HERSHEY ARENA', 'PRODUCTION'], pressure: 'medium', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop', owner: { id: 'juan', name: 'Juan' }, threadId: 'hershey-stageplot' },
    { id: 'e2', headline: 'Venue requested revised trim notation', body: 'Mags added venue note to thread.', timestamp: new Date(Date.now()-1000*60*45).toISOString(), tags: ['VENUE', 'PRODUCTION'], pressure: 'high', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=900&auto=format&fit=crop', owner: { id: 'mags', name: 'Mags' }, threadId: 'hershey-stageplot' },
  ],
  pressureSummary: { total: 2, high: 1, medium: 1 },
  runtimeTimeline: [
    { id: 't1', timestamp: new Date().toISOString(), actor: 'Juan', summary: 'Stage plot uploaded', continuityObjectId: 'hershey-stageplot', pressureDelta: 1 },
    { id: 't2', timestamp: new Date(Date.now()-1000*60*45).toISOString(), actor: 'Mags', summary: 'Venue trim request added', continuityObjectId: 'hershey-stageplot', pressureDelta: 1 },
  ],
}
