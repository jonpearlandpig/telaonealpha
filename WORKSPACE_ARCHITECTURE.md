# Workspace Architecture — ShowTELA Sovereignty

**Date:** 2026-06-01
**Branch:** showtela-human-trust-v1

---

## Lifecycle Model

ShowTELA lifecycle is fully event-sourced. Every action (create, archive, rename) persists a typed event into `runtime_events`. The registry is reconstructed from events on each read — no separate workspace table.

### Event Types

| Event | Type string | Persisted in |
|---|---|---|
| Create | `showtela.lifecycle.created` | `runtime_events` |
| Archive | `showtela.lifecycle.archived` | `runtime_events` |
| Rename | `showtela.lifecycle.renamed` | `runtime_events` |

Delete is **non-event-sourced** — it physically removes all workspace-scoped records from all tables. This is intentional: deleted workspaces cannot be replayed.

### Workspace ID

Generated at creation time: `showtela-{slug}-{10-char-random}` (e.g. `showtela-crusade-2027-a4f8d3c12e`). Used as the primary isolation key across all tables.

### Name Resolution

On list/resolve, the registry builder reads:
1. `showtela.lifecycle.created` events (base name)
2. `showtela.lifecycle.renamed` events (override, latest wins)

The latest renamed event for a workspace_id overrides the original name.

---

## System Map

```
Founder Action             Route                     Library Function
─────────────────────────────────────────────────────────────────────
Create ShowTELA     →  POST /showtela/build      →  registerShowTelaCreation()
Create (API)        →  POST /api/showtela/build  →  registerShowTelaCreation()
Archive ShowTELA    →  POST /showtela/archive    →  registerShowTelaArchive()
Rename ShowTELA     →  POST /showtela/rename     →  registerShowTelaRename()
Delete ShowTELA     →  POST /showtela/delete     →  deleteShowTela()
List Workspaces     →  GET  /api/workspaces      →  listActiveShowTelas()
```

---

## Deletion Behavior

`deleteShowTela(workspaceId)` issues `.delete().eq('workspace_id', workspaceId)` against each table in sequence:

1. `runtime_events` — all events including lifecycle events
2. `durable_artifacts` — ingested artifacts
3. `durable_entities` — extracted entities
4. `durable_snapshots` — continuity snapshots
5. `operational_states` — state projections
6. `production_riders` — venue riders
7. `venue_entities` — venue entity records
8. `venue_assessments` — venue assessments
9. `readiness_reviews` — readiness reviews
10. `operational_objects` — canonical objects

**Tables NOT deleted** (no `workspace_id` column):
- `constitutional_events` — governance trace, not workspace-scoped

Delete requires the founder to type the exact ShowTELA name as confirmation. Case-insensitive match.

---

## Frontend Architecture

### Home Page (`/`)

`BuildShowTelaLauncher` (server component) renders:
- Active ShowTELA registry with Open / Archive / Rename / Delete per entry
- Archived ShowTELA registry
- Create ShowTELA form
- Status banners for created / renamed / deleted events

`WorkspaceEntryActions` (client component, imported in launcher):
- Manages rename (inline text input form) and delete (confirm-name form) state per entry
- Zero JavaScript required for archive — still a plain form POST

### ShowTELA Runtime (`/showtela`)

`ShowTelaRuntime` → `ShowTelaShell` (both client components):
- Accepts `activeShowTelas: Array<{ showTelaId, showTelaName }>` from server
- Profile tab renders `WorkspaceSwitcher` at top

`WorkspaceSwitcher` (client component):
- Shows current ShowTELA name
- Expands to show other active ShowTELAs as navigation links
- "Create ShowTELA" → `/`
- "Manage ShowTELAs" → `/`

---

## Data Flow

```
showtela/page.tsx (server)
  ├── listActiveShowTelas()          → passed as activeShowTelas prop
  ├── resolveShowTela(showTelaId)    → current showTela
  └── hydrateRuntime(workspaceId)    → vm
        ↓
  ShowTelaRuntime (client)
        ↓
  ShowTelaShell (client)
    └── Profile tab
          └── WorkspaceSwitcher
                ├── currentShowTelaId / currentShowTelaName (from props)
                └── activeShowTelas (from props, no client fetch)
```

---

## Empty State

When a ShowTELA has no continuity (people=0, operations=0, feed=0, artifacts=0, calendar=0), `ShowTelaShell` renders `OpeningSurface` full-screen. This is the first-run experience:

- Presence logo + ambient atmosphere
- User profile with `+` to open ingestion
- ShowTELA name displayed
- Creation verification summary (when `showTelaCreated=true`)
- Upload/ingest entry points (`Anchor Directory`, `Calendar`, `Production Rider`, `Quick Update`)

No demo data is shown. Empty state is already fully implemented.
