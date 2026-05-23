create table if not exists constitutional_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  event_version integer default 1,
  schema_version text default 'v1',

  event_type text not null,

  parent_event_id uuid references constitutional_events(id),

  title text,
  summary text,

  human_actor text,

  operator_overlays jsonb default '[]'::jsonb,

  governance_state text,
  execution_state text,
  decision_state text,

  continuity_refs jsonb default '[]'::jsonb,
  model_participants jsonb default '[]'::jsonb,

  routing_metadata jsonb default '{}'::jsonb,

  confidence_score numeric,

  reversible boolean default true,

  lineage_hash text not null,

  metadata jsonb default '{}'::jsonb
);

create index if not exists constitutional_events_created_idx
  on constitutional_events(created_at desc);

create index if not exists constitutional_events_parent_idx
  on constitutional_events(parent_event_id);

alter table constitutional_events enable row level security;

create or replace function prevent_constitutional_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'constitutional_events is append-only';
end;
$$;

create trigger constitutional_events_append_only
  before update or delete on constitutional_events
  for each row
  execute function prevent_constitutional_event_mutation();
