create table if not exists readiness_reviews (
  review_id text primary key,
  workspace_id text not null,
  showtela_id text not null,
  title text not null,
  description text not null default '',
  owner text not null,
  status text not null check (status in ('GREEN', 'YELLOW', 'RED', 'UNKNOWN')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  review_date date not null,
  scope text not null,
  sections jsonb not null default jsonb_build_object(
    'greenItems', '[]'::jsonb,
    'yellowItems', '[]'::jsonb,
    'redItems', '[]'::jsonb,
    'blockingItems', '[]'::jsonb,
    'recommendedActions', '[]'::jsonb,
    'notes', ''
  ),
  evidence_links jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb
);

create index if not exists readiness_reviews_workspace_idx
  on readiness_reviews (workspace_id, updated_at desc);

create index if not exists readiness_reviews_showtela_idx
  on readiness_reviews (showtela_id, review_date desc);

create index if not exists readiness_reviews_status_idx
  on readiness_reviews (status, updated_at desc);
