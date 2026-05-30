// Run these DDL statements against your Supabase project via the SQL editor
// or supabase/migrations/ if using the local CLI workflow.
// Tables use snake_case columns; TypeScript types in schema.ts use camelCase.

export const SUPABASE_MIGRATIONS = [
  `
  create table if not exists durable_artifacts (
    id text primary key,
    workspace_id text not null,
    thread_id text not null,
    file_name text,
    mime_type text,
    lineage_id text,
    artifact_group_id text,
    payload text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    provenance jsonb not null
  );
  create index if not exists durable_artifacts_workspace_idx on durable_artifacts (workspace_id);
  create index if not exists durable_artifacts_thread_idx on durable_artifacts (workspace_id, thread_id);
  `,

  `
  create table if not exists durable_entities (
    id text primary key,
    workspace_id text not null,
    name text not null,
    type text not null,
    continuity_count integer not null default 0,
    unresolved_links integer not null default 0,
    related_artifacts text[] not null default '{}',
    related_threads text[] not null default '{}',
    temporal_clusters text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    provenance jsonb not null
  );
  create index if not exists durable_entities_workspace_idx on durable_entities (workspace_id);
  `,

  `
  create table if not exists durable_snapshots (
    id text primary key,
    workspace_id text not null,
    snapshot_kind text not null default 'acceleration',
    replay_source text not null default 'runtime_events',
    thread_refs text[] not null default '{}',
    entity_refs text[] not null default '{}',
    lineage_refs text[] not null default '{}',
    unresolved_count integer not null default 0,
    replayed_event_count integer not null default 0,
    latest_replay_sequence bigint,
    latest_event_id text,
    latest_event_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    provenance jsonb not null
  );
  create index if not exists durable_snapshots_workspace_idx on durable_snapshots (workspace_id);
  `,

  `
  create table if not exists durable_ingestion_jobs (
    id text primary key,
    workspace_id text not null,
    status text not null default 'pending',
    payload jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index if not exists durable_ingestion_jobs_workspace_status_idx on durable_ingestion_jobs (workspace_id, status);
  `,

  `
  create table if not exists runtime_events (
    id text primary key,
    workspace_id text not null,
    replay_sequence bigint generated always as identity,
    type text not null,
    event_version integer not null,
    schema_version text not null,
    source text not null,
    governance_state text not null,
    execution_state text not null,
    trace_id text,
    correlation_id text,
    lineage_id text,
    payload_type text,
    payload jsonb,
    created_at timestamptz not null default now()
  );
  create index if not exists runtime_events_created_idx on runtime_events (created_at desc);
  create index if not exists runtime_events_workspace_created_idx on runtime_events (workspace_id, created_at desc);
  create unique index if not exists runtime_events_replay_sequence_idx on runtime_events (replay_sequence);
  create index if not exists runtime_events_workspace_replay_idx on runtime_events (workspace_id, replay_sequence asc);
  create index if not exists runtime_events_trace_idx on runtime_events (trace_id, created_at asc);
  create index if not exists runtime_events_lineage_idx on runtime_events (lineage_id, created_at asc);
  `,

  `
  create table if not exists operational_objects (
    id text primary key,
    object_type text not null,
    lineage_id text,
    status text not null,
    payload jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index if not exists operational_objects_lineage_idx on operational_objects (lineage_id, updated_at desc);
  `,

  `
  create table if not exists routing_plans (
    id text primary key,
    action text not null,
    governance_state text not null,
    selected_operators text[] not null default '{}',
    sequence jsonb not null default '[]',
    rollback_class text not null,
    escalation_path text[] not null default '{}',
    created_at timestamptz not null default now()
  );
  create index if not exists routing_plans_action_idx on routing_plans (action, created_at desc);
  `,

  `
  create table if not exists enforcement_actions (
    id text primary key,
    event_id text,
    action text not null,
    decision text not null,
    reason text,
    created_at timestamptz not null default now()
  );
  create index if not exists enforcement_actions_event_idx on enforcement_actions (event_id, created_at desc);
  `,

  `
  create table if not exists lineage_graph (
    id text primary key,
    lineage_id text not null,
    parent_lineage_id text,
    event_id text,
    relation_type text not null,
    created_at timestamptz not null default now()
  );
  create index if not exists lineage_graph_lineage_idx on lineage_graph (lineage_id, created_at asc);
  create index if not exists lineage_graph_parent_idx on lineage_graph (parent_lineage_id, created_at asc);
  `,
]
