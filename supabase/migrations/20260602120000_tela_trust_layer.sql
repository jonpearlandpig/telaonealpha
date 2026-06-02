-- =============================================================================
-- TELAOne Trust Layer Migration
-- Ports three trust engines from CondoBunk:
--   1. tela_threads     — persistent conversation memory
--   2. tela_messages    — per-thread message history
--   3. tela_change_log  — auditable record of every TELA-initiated action
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TELA Threads — persistent conversation sessions
-- -----------------------------------------------------------------------------
create table if not exists tela_threads (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id      text not null,
  title        text not null default 'New conversation',
  scope        text not null default 'global',        -- 'global' | 'show:{id}'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tela_threads_workspace_idx
  on tela_threads (workspace_id, updated_at desc);

create index if not exists tela_threads_user_idx
  on tela_threads (user_id, updated_at desc);

-- -----------------------------------------------------------------------------
-- 2. TELA Messages — per-thread message history
-- -----------------------------------------------------------------------------
create table if not exists tela_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references tela_threads(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant', 'system')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists tela_messages_thread_idx
  on tela_messages (thread_id, created_at asc);

-- -----------------------------------------------------------------------------
-- 3. TELA Change Log — auditable record of every TELA-initiated write
-- -----------------------------------------------------------------------------
create table if not exists tela_change_log (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    text not null,
  user_id         text not null,
  thread_id       uuid references tela_threads(id) on delete set null,

  -- What changed
  entity_type     text not null,   -- 'show_event' | 'contact' | 'milestone' | 'document' | etc.
  entity_id       text not null,
  action          text not null,   -- 'CREATE' | 'UPDATE' | 'DELETE' | 'RESOLVE'
  change_summary  text not null,
  change_reason   text not null default '',

  -- Severity classification
  severity        text not null default 'INFO'
                  check (severity in ('INFO', 'IMPORTANT', 'CRITICAL')),

  -- Impact flags — used for alert routing
  affects_safety  boolean not null default false,
  affects_time    boolean not null default false,
  affects_money   boolean not null default false,

  -- Full before/after for auditability
  payload_before  jsonb default null,
  payload_after   jsonb default null,

  created_at      timestamptz not null default now()
);

create index if not exists tela_change_log_workspace_idx
  on tela_change_log (workspace_id, created_at desc);

create index if not exists tela_change_log_entity_idx
  on tela_change_log (entity_type, entity_id, created_at desc);

create index if not exists tela_change_log_severity_idx
  on tela_change_log (severity, created_at desc)
  where severity in ('IMPORTANT', 'CRITICAL');

-- Append-only — changes are never mutated after creation
create or replace function prevent_change_log_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'tela_change_log is append-only';
end;
$$;

create trigger tela_change_log_append_only
  before update or delete on tela_change_log
  for each row
  execute function prevent_change_log_mutation();

