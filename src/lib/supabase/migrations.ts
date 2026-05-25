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
    thread_refs text[] not null default '{}',
    entity_refs text[] not null default '{}',
    lineage_refs text[] not null default '{}',
    unresolved_count integer not null default 0,
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
]
