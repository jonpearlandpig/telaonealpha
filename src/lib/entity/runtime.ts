import { fetchShowTelaFeed } from '@/lib/notion/showtela'
import type { ContinuityCard } from '@/types/feed'

export type EntityRuntimeSurface = {
  id: string
  name: string
  role: string
  state: 'active' | 'blocked' | 'dormant' | 'escalating'
  relationship: string
  timeline: ContinuityCard[]
  unresolved: ContinuityCard[]
  linkedDecisions: ContinuityCard[]
  linkedProjects: string[]
  linkedEntities: string[]
}

function titleCase(input: string): string {
  return input.split(/[-_\s]+/).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(' ')
}

function deriveState(cards: ContinuityCard[]): EntityRuntimeSurface['state'] {
  const unresolved = cards.filter((c) => c.unresolved).length
  const pinned = cards.filter((c) => c.pinned).length
  if (pinned > 0 || unresolved >= 3) return 'escalating'
  if (unresolved > 0) return 'blocked'
  if (cards.length > 0) return 'active'
  return 'dormant'
}

export async function buildEntityRuntimeSurface(entityId: string): Promise<EntityRuntimeSurface> {
  const feed = await fetchShowTelaFeed()
  const decoded = decodeURIComponent(entityId)
  const name = titleCase(decoded)

  const timeline = feed.cards.filter((c) => {
    const hay = `${c.owner} ${c.department} ${c.relationship ?? ''} ${c.tags.join(' ')} ${c.summary}`.toLowerCase()
    return hay.includes(decoded.toLowerCase())
  }).slice(0, 20)

  const unresolved = timeline.filter((c) => c.unresolved)
  const linkedDecisions = timeline.filter((c) => c.type === 'Decision' || c.type === 'Approval').slice(0, 6)
  const linkedProjects = Array.from(new Set(timeline.flatMap((c) => c.tags))).slice(0, 6)
  const linkedEntities = Array.from(new Set(timeline.map((c) => c.owner).filter((o) => o !== name))).slice(0, 6)

  const role = timeline[0]?.department ?? 'Operational Entity'
  const relationship = timeline[0]?.relationship ?? `${name} operational continuity thread`

  return {
    id: entityId,
    name,
    role,
    state: deriveState(timeline),
    relationship,
    timeline,
    unresolved,
    linkedDecisions,
    linkedProjects,
    linkedEntities,
  }
}
