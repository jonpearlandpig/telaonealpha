create table if not exists operational_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  show_id text not null default 'crusade',
  state_id text not null,
  entity_id text not null,
  entity_type text not null,
  entity_name text not null,
  state_code text not null,
  state_label text not null,
  state_emoji text,
  severity text not null,
  lifecycle_state text not null default 'entered',
  trigger_detail text not null,
  resolution_action text,
  resolution_owner text,
  dependency_ids text[] not null default '{}',
  dependency_chain text[] not null default '{}',
  reasoning_chain text[] not null default '{}',
  derivation_source text,
  is_active boolean not null default true,
  state_entered_at timestamptz not null default now(),
  state_updated_at timestamptz not null default now(),
  state_idempotency_key text generated always as (workspace_id || ':' || show_id || ':' || state_id) stored,
  derivation_version text not null,
  derived_at timestamptz not null,
  explanation text,
  source_event_ids text[] not null default '{}',
  trace_id text,
  projection_version text not null,
  lineage_ids text[] not null default '{}'
);

create index if not exists operational_states_workspace_active_idx
  on operational_states (workspace_id, show_id, is_active, derived_at desc);

create unique index if not exists operational_states_projection_state_uidx
  on operational_states (workspace_id, show_id, projection_version, state_id);
