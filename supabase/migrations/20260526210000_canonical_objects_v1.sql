-- Canonical operational objects: Phase 2 extension columns.
--
-- Adds workspace_id (the critical gap in the existing schema) and the
-- canonical persistence fields required by CanonicalOperationalObject.
-- Existing rows are given safe defaults so the migration is non-destructive.
--
-- After this migration, orchestrationPersistence.ts may write workspace_id.
-- objectPersistenceSupabase.ts implements the full PersistenceContract
-- against this extended schema.

-- workspace_id: primary isolation dimension — every object belongs to one workspace.
-- Initially nullable to allow backfill before enforcing NOT NULL.
alter table operational_objects
  add column if not exists workspace_id text;

-- Backfill existing rows to a known default workspace.
-- Production rows may be updated post-migration with correct workspace resolution.
update operational_objects
set workspace_id = 'default-workspace'
where workspace_id is null;

-- replay_confirmed: true when at least one approved replay event has confirmed this object.
-- Defaults to false — all existing rows are treated as unconfirmed (ingest-proposed).
alter table operational_objects
  add column if not exists replay_confirmed boolean not null default false;

-- last_confirmed_sequence: highest replay sequence that confirmed this object's identity.
-- Nullable — only set once replay has confirmed the object.
alter table operational_objects
  add column if not exists last_confirmed_sequence bigint;

-- augmented_at: last time ingest augmented this object, distinct from replay confirmation.
-- Nullable — null until first ingest augmentation after Phase 2 wiring.
alter table operational_objects
  add column if not exists augmented_at timestamptz;

-- merge_history: append-only audit trail of all merge operations (ObjectMergeRecord[]).
-- Nullable — null for objects that have never been merged.
alter table operational_objects
  add column if not exists merge_history jsonb;

-- provenance: origin event identity chain (ObjectProvenance).
-- Nullable — null for rows written before Phase 2.
alter table operational_objects
  add column if not exists provenance jsonb;

-- Indexes for the canonical query patterns used by PersistenceContract.

-- workspace isolation: every load query scopes to workspace_id
create index if not exists operational_objects_workspace_idx
  on operational_objects (workspace_id);

-- lineage lookup: relationship traversal by lineage chain
create index if not exists operational_objects_lineage_idx
  on operational_objects (lineage_id);

-- replay confirmation filter: separate confirmed from proposed objects
create index if not exists operational_objects_replay_confirmed_idx
  on operational_objects (replay_confirmed);

-- sequence-based ordering for replay reconstruction
create index if not exists operational_objects_sequence_idx
  on operational_objects (last_confirmed_sequence);

-- recency ordering within workspace for projection building
create index if not exists operational_objects_updated_idx
  on operational_objects (updated_at desc);

-- composite: primary workspace query — confirmed objects by recency
create index if not exists operational_objects_workspace_confirmed_updated_idx
  on operational_objects (workspace_id, replay_confirmed, updated_at desc);
