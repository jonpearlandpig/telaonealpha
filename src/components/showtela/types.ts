import type { MediaMemoryType, RuntimeTimelineItem } from '@/lib/showtela/types';

export type FeedItem = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  summary: string;
  owner: string;
  updated: string;
};

export type ContinuityEntity = {
  id: string;
  name: string;
  unresolvedCount: number;
  latest?: string;
  image: string;
  active?: boolean;
};

export type VisualPreset = {
  image: string;
  category: string;
  realisticTitle: string;
  realisticSummary: string;
};

export type OperationEntity = ContinuityEntity & {
  label: string;
};

export type UnresolvedPressure = {
  unresolvedCount: number;
  overdueCount: number;
  blockedCount: number;
  pendingApprovals: number;
};

export type ContinuityFeedItem = {
  id: string;
  timestamp: string;
  title: string;
  summary: string;
  owner: string;
  image: string;
  avatar: string;
  unresolved: boolean;
  waitingOn?: string;
  blockedBy?: string;
  approvalOwner?: string;
  lastContactAt?: string;
  trustLevel?: 'low' | 'medium' | 'high';
  operationalRisk?: 'low' | 'medium' | 'high';
  unresolvedDependencies?: string[];
  linkedEntities?: string[];
  linkedThreads?: string[];
  attachments?: Array<{ id: string; type: MediaMemoryType; title: string; previewUrl?: string }>;
};

export type ContinuityDomain = 'person' | 'operation' | 'unresolved' | 'continuity_event' | 'touring_assumption' | 'risk_signal' | 'communication_event';

export type OperationalContinuityObject = {
  id: string;
  type: ContinuityDomain;
  title: string;
  status: string;
  timestamp: string;
  priority: string;
  owner: string;
  unresolvedCount: number;
  linkedPeople: string[];
  sourcePage: string;
  emotionalWeight: number;
  continuitySummary: string;
  operationalImportance: number;
  recencyScore: number;
  unresolvedImpact: number;
};

export type ShowTelaViewModel = {
  activeOps: ContinuityEntity[];
  fluencyPartners: ContinuityEntity[];
  crusadeOperations: OperationEntity[];
  unresolvedPressure: UnresolvedPressure;
  feed: ContinuityFeedItem[];
  continuityObjects: OperationalContinuityObject[];
  runtimeTimeline: RuntimeTimelineItem[];
};
