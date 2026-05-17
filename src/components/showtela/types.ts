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
  latest: string;
  image: string;
  active?: boolean;
};

export type VisualPreset = {
  image: string;
  category: string;
  realisticTitle: string;
  realisticSummary: string;
};
