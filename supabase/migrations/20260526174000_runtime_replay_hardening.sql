alter table durable_snapshots
  add column if not exists snapshot_kind text not null default 'acceleration',
  add column if not exists replay_source text not null default 'runtime_events',
  add column if not exists replayed_event_count integer not null default 0,
  add column if not exists latest_replay_sequence bigint,
  add column if not exists latest_event_id text,
  add column if not exists latest_event_at timestamptz;

alter table durable_snapshots
  drop column if exists checkpoint_state;

alter table runtime_events
  add column if not exists workspace_id text;

update runtime_events
set workspace_id = case
  when workspace_id is not null then workspace_id
  when payload_type in ('continuity.inbox-item', 'continuity.normalized-event') then 'tela-showtela'
  when coalesce(payload->>'threadId', '') = 'showtela-runtime-continuity' then 'tela-showtela'
  when coalesce(payload->>'threadId', '') = 'pearl-drop' then 'tela-showtela'
  else 'default-workspace'
end
where workspace_id is null;

alter table runtime_events
  alter column workspace_id set not null;

alter table runtime_events
  add column if not exists replay_sequence bigint generated always as identity;

create unique index if not exists runtime_events_replay_sequence_idx
  on runtime_events (replay_sequence);

create index if not exists runtime_events_workspace_replay_idx
  on runtime_events (workspace_id, replay_sequence asc);
