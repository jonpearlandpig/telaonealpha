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
};

export type ShowTelaViewModel = {
  activeOps: ContinuityEntity[];
  fluencyPartners: ContinuityEntity[];
  crusadeOperations: OperationEntity[];
  unresolvedPressure: UnresolvedPressure;
  feed: ContinuityFeedItem[];
};
