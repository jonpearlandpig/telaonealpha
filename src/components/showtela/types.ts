import type { ContinuityEvent, ShowTelaHydrationSummary, ShowTelaRuntimeSnapshotMeta } from '@/lib/showtela/types'

export interface PersonItem {
  id: string
  name: string
  image: string
  latest?: string
  unresolvedCount?: number
  label?: string
}

export interface OperationEntity {
  id: string
  name: string
  label: string
  image: string
  latest?: string
  unresolvedCount?: number
}

export interface UnresolvedPressure {
  unresolvedCount: number
  overdueCount: number
  blockedCount: number
  pendingApprovals: number
}

export interface UnresolvedItem {
  id: string
  title: string
  severity?: string
  blocking?: boolean
  operation?: string
  aging?: number
  owner?: string
}

export interface FeedItem {
  id: string
  timestamp: string
  title: string
  summary: string
  owner: string
  image: string
  avatar: string
  unresolved: boolean
  linkedEntities: string[]
  pressure?: string
}

export interface ShowTelaViewModel {
  activeOps: PersonItem[]
  fluencyPartners: PersonItem[]
  crusadeOperations: OperationEntity[]
  unresolvedPressure: UnresolvedPressure
  unresolved: UnresolvedItem[]
  feed: FeedItem[]
  continuityObjects: ContinuityEvent[]
  runtimeTimeline: Array<{ id: string; timestamp: string; actor: string; summary: string; continuityObjectId: string; pressureDelta: number }>
  source?: 'supabase' | 'notion' | 'empty'
  diagnosticState?: string
  hydration?: ShowTelaHydrationSummary
  runtimeSnapshotMeta?: ShowTelaRuntimeSnapshotMeta
}

export type ActionType = 'resolve' | 'escalate' | 'comment' | 'archive'

export interface ContinuityFeedItem {
  id: string
  title: string
  summary: string
  timestamp: string
  image: string
  owner: string
  unresolved: boolean
  linkedEntities: string[]
}
