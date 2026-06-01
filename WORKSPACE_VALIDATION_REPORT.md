# Workspace Validation Report

**Date:** 2026-06-01  
**Branch:** showtela-human-trust-v1  
**Build:** PASSING

---

## Validation Checklist

### Create ShowTELA
- [x] `POST /showtela/build` creates workspace, persists lifecycle event, redirects to home with `?showtela=...&showtela_created=1`
- [x] `POST /api/showtela/build` JSON endpoint available for programmatic creation
- [x] New ShowTELA opens to empty state (OpeningSurface) with name displayed
- [x] Build form validates minimum name length (3 chars)

### Rename ShowTELA
- [x] `POST /showtela/rename` route exists and validates showTelaId + name
- [x] Persists `showtela.lifecycle.renamed` event via `registerShowTelaRename()`
- [x] Registry builder reads renamed events and applies latest name override
- [x] BuildShowTelaLauncher shows `WorkspaceEntryActions` with inline Rename form per entry
- [x] Rename redirects to `/?showtela_renamed=1` with success banner

### Archive ShowTELA
- [x] `POST /showtela/archive` route existed and remains unchanged
- [x] Archives display in Archived ShowTELAs section with "Open Replay"
- [x] Archive removes ShowTELA from active list, preserves all events

### Delete ShowTELA
- [x] `POST /showtela/delete` route exists with name-confirmation validation
- [x] `deleteShowTela()` removes records from all 10 workspace-scoped tables
- [x] Delete requires typed confirmation matching ShowTELA name (case-insensitive)
- [x] Delete redirects to `/?showtela_deleted=1` with destruction banner
- [x] Deletion log records workspaceId, actor, and total record count

### Switch ShowTELA
- [x] `WorkspaceSwitcher` component added to Profile tab in ShowTelaShell
- [x] Current ShowTELA name shown at top of switcher
- [x] Other active ShowTELAs listed as direct navigation links
- [x] "Create ShowTELA" navigates to home (`/`)
- [x] "Manage ShowTELAs" navigates to home (`/`)

### Reload Persistence
- [x] ShowTELA ID passed via `?showtela=...` URL param on open
- [x] Server resolves ShowTELA from event store on each page load
- [x] Workspace ID derived from resolved ShowTELA, not client state

### Empty State
- [x] New ShowTELA opens to `OpeningSurface` (no demo data)
- [x] OpeningSurface shows ShowTELA name and creation verification summary
- [x] Upload/ingest entry points available immediately
- [x] `+` button on profile avatar opens full ingestion modal

---

## Build Status

```
✓ TypeScript: no errors in changed files
✓ Next.js build: passing
✓ New routes compiled:
  - /api/workspaces
  - /showtela/rename
  - /showtela/delete
✓ Existing routes unchanged:
  - /showtela/build
  - /showtela/archive
  - /api/showtela/build
```

---

## Known Gaps

- **Delete not tested against live Supabase** — the cascade runs best-effort (no transaction). If a table delete fails, others still proceed. Failures are logged but don't abort.
- **Rename in runtime switcher** — the runtime `WorkspaceSwitcher` does not expose rename/delete. Manage flows live at `/` (home). This matches the brief's design intent.
- **Multi-workspace rename race** — if two clients rename the same workspace simultaneously, last-write wins based on event `created_at`. This is acceptable for the founder-solo use case.
