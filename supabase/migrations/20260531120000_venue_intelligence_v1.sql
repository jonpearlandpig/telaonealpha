-- Venue Intelligence Phase 1B
-- Adds venue tracking columns to durable_artifacts.
-- Enables active rider selection per venue.
-- Migration is additive only — no existing columns modified.

alter table durable_artifacts
  add column if not exists venue_id text,
  add column if not exists is_active_rider boolean default false;

-- Query: all riders for a venue
create index if not exists durable_artifacts_venue_idx
  on durable_artifacts(venue_id)
  where venue_id is not null;

-- Query: the active rider for a venue (at most one per venue)
create index if not exists durable_artifacts_active_rider_idx
  on durable_artifacts(venue_id, is_active_rider)
  where is_active_rider = true;
