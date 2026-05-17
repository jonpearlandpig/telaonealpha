export type FeedItem = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  summary: string;
  owner: string;
  updated: string;
};

export type ActiveOp = {
  id: string;
  name: string;
  image: string;
  unresolvedCount: number;
  latest: string;
};

export type FluencyPartner = {
  id: string;
  label: string;
  image: string;
  unresolvedCount: number;
};

export type OperationEntity = {
  id: string;
  label: string;
  image: string;
  unresolvedCount: number;
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

export type UnresolvedPressure = {
  unresolvedCount: number;
  overdueCount: number;
  blockedCount: number;
  pendingApprovals: number;
};

export type ShowTelaViewModel = {
  activeOps: ActiveOp[];
  fluencyPartners: FluencyPartner[];
  crusadeOperations: OperationEntity[];
  unresolvedPressure: UnresolvedPressure;
  feed: ContinuityFeedItem[];
};

export type ContinuityEntity = ActiveOp;
export type VisualPreset = { image: string; category: string; realisticTitle: string; realisticSummary: string };
