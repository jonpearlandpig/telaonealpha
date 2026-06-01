create table if not exists public.production_riders (
  id text primary key,
  workspace_id text not null,
  title text not null,
  source_artifact_id text,
  is_active boolean not null default false,
  departments jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_riders_workspace_active_idx
  on public.production_riders (workspace_id, is_active, updated_at desc);

create table if not exists public.venue_entities (
  id text primary key,
  workspace_id text not null,
  name text not null,
  packet_file_name text not null,
  source_artifact_id text not null,
  packet_text text not null default '',
  confidence double precision not null default 0,
  profile_summary text not null default '',
  location text,
  capacities jsonb not null default '[]'::jsonb,
  stage jsonb not null default '{}'::jsonb,
  rigging jsonb not null default '{"notes":[]}'::jsonb,
  power jsonb not null default '{"services":[],"notes":[]}'::jsonb,
  loading jsonb not null default '{"truckAccessNotes":[]}'::jsonb,
  audio jsonb not null default '{"available":[],"missing":[],"notes":[]}'::jsonb,
  lighting jsonb not null default '{"available":[],"missing":[],"notes":[]}'::jsonb,
  video jsonb not null default '{"available":[],"missing":[],"notes":[]}'::jsonb,
  communications jsonb not null default '{"available":[],"missing":[],"notes":[]}'::jsonb,
  hospitality jsonb not null default '{"available":[],"missing":[],"notes":[]}'::jsonb,
  restrictions jsonb not null default '[]'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  raw_facts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_entities_workspace_updated_idx
  on public.venue_entities (workspace_id, updated_at desc);

create table if not exists public.venue_assessments (
  id text primary key,
  workspace_id text not null,
  venue_id text not null references public.venue_entities(id) on delete cascade,
  rider_id text not null references public.production_riders(id) on delete cascade,
  venue_profile jsonb not null default '{}'::jsonb,
  compatibility_report jsonb not null default '{}'::jsonb,
  open_issues jsonb not null default '[]'::jsonb,
  readiness_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_assessments_workspace_updated_idx
  on public.venue_assessments (workspace_id, updated_at desc);

create index if not exists venue_assessments_venue_idx
  on public.venue_assessments (venue_id, updated_at desc);
