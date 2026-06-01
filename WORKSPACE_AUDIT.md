# Workspace Audit — ShowTELA Sovereignty

**Date:** 2026-06-01  
**Branch:** showtela-human-trust-v1  
**Auditor:** Claude Code (sovereign authority: Jon Hartman)

---

## Executive Summary

Significant lifecycle infrastructure already exists. Three of five phases are partially or fully addressed by existing code. What is missing is founder-facing UI — the controls needed to rename, delete, and switch between ShowTELAs inside the runtime itself.

---

## Existing Infrastructure (Do Not Duplicate)

### ShowTELA Lifecycle Engine — `src/lib/showtela/lifecycle.ts`

**Exists and functional:**
- `createShowTelaWorkspaceId(name)` — deterministic workspace ID generation
- `normalizeShowTelaName(input)` — name normalization
- `registerShowTelaCreation(input)` — persists `showtela.lifecycle.created` event
- `registerShowTelaArchive(input)` — persists `showtela.lifecycle.archived` event
- `listActiveShowTelas()` — returns active ShowTELA registry
- `listArchivedShowTelas()` — returns archived ShowTELA registry
- `resolveShowTela(id)` — resolves a single ShowTELA by event ID
- `verifyCleanShowTela(workspaceId)` — verifies empty workspace state
- `isCleanShowTela(verification)` — clean state predicate

**Missing:**
- `registerShowTelaRename()` — no rename event or registry support
- `deleteShowTela()` — no deletion of workspace-scoped records

### ShowTELA Registry — `src/lib/showtela/lifecycleRegistry.ts`

**Exists and functional:**
- `buildShowTelaRegistry()` — builds active/archived registry from events
- `buildActiveShowTelaRegistry()` — active-only subset
- Event-sourced: reads from `runtime_events` table

**Missing:**
- Renamed event type support
- Name override from latest renamed event

### API Routes (Server-Side)

| Route | Method | Status |
|---|---|---|
| `/showtela/build` | POST form | EXISTS — creates ShowTELA, redirects to `/?showtela=...` |
| `/api/showtela/build` | POST JSON | EXISTS — creates ShowTELA, returns JSON |
| `/showtela/archive` | POST form | EXISTS — archives ShowTELA |
| `/showtela/rename` | POST form | **MISSING** |
| `/showtela/delete` | POST form | **MISSING** |
| `/api/workspaces` | GET | **MISSING** — no API to list ShowTELAs for client |

### Frontend — Home Page (`/`)

`BuildShowTelaLauncher.tsx` serves as the current management surface:
- Shows active ShowTELAs with "Open ShowTELA" + "Archive" per entry
- Shows archived ShowTELAs with "Open Replay"
- Shows "Build ShowTELA" form

**Missing:**
- Rename action per entry
- Delete action per entry (with confirmation)

### Frontend — ShowTELA Runtime (`/showtela`)

`ShowTelaShell.tsx` Profile tab shows:
- User photo, name
- Action cards (Voice, Update, Uploads, Calendar)
- Sign Out link

**Missing:**
- Workspace switcher showing current ShowTELA + switch options
- "Create ShowTELA" link
- "Manage ShowTELAs" link to home

### Empty State — `OpeningSurface.tsx`

**EXISTS and is functional.** When `isEmpty` is true (no people, operations, artifacts, feed, calendar), `ShowTelaShell` renders the `OpeningSurface` full-screen with:
- TELA presence logo
- User profile with `+` button to trigger ingestion
- ShowTELA name display
- Creation summary verification card
- Upload/ingest entry points via `onOpenIngest()`

Phase 5 is **already complete.** No changes needed.

---

## Database Tables with Workspace Scope

Tables that must be cleaned on ShowTELA delete:

| Table | workspace_id column | Notes |
|---|---|---|
| `runtime_events` | `workspace_id` text NOT NULL | Primary event store |
| `durable_artifacts` | `workspace_id` text | Artifact store |
| `durable_entities` | `workspace_id` text | Entity store |
| `durable_snapshots` | `workspace_id` text | Snapshot store |
| `operational_objects` | `workspace_id` text (nullable, backfilled) | Canonical objects |
| `operational_states` | `workspace_id` text NOT NULL | State projections |
| `production_riders` | `workspace_id` text NOT NULL | Venue riders |
| `venue_entities` | `workspace_id` text NOT NULL | Venue entities |
| `venue_assessments` | `workspace_id` text NOT NULL | Venue assessments |
| `readiness_reviews` | `workspace_id` text NOT NULL | Readiness reviews |
| `constitutional_events` | **no workspace_id** | Not workspace-scoped — skip |

---

## Gap Analysis

| Phase | Status | Action Required |
|---|---|---|
| Phase 1 — Audit | **Done** | This document |
| Phase 2 — Switcher | **Missing** | Build `WorkspaceSwitcher.tsx` + add to Profile tab |
| Phase 3 — Create | **Exists** | Add switcher links to create (`/`) |
| Phase 4 — Manage | **Partial** | Add rename + delete to `BuildShowTelaLauncher.tsx` |
| Phase 5 — Empty State | **Complete** | No changes needed |
| Phase 6 — Validation | **Pending** | Build after implementation |

---

## Build Scope (No Duplication)

**New lifecycle functions:**
1. `registerShowTelaRename()` in `lifecycle.ts`
2. `deleteShowTela()` in `lifecycle.ts`
3. Updated `buildShowTelaRegistry()` to apply rename events

**New routes:**
1. `/showtela/rename/route.ts` — POST form action
2. `/showtela/delete/route.ts` — POST form action with confirmation
3. `/api/workspaces/route.ts` — GET list for switcher

**New components:**
1. `WorkspaceSwitcher.tsx` — Profile tab switcher
2. `WorkspaceEntryActions.tsx` — Per-entry rename/delete client wrapper

**Updated files:**
1. `lifecycleRegistry.ts` — renamed event type + registry update
2. `lifecycle.ts` — rename + delete functions
3. `BuildShowTelaLauncher.tsx` — rename + delete per entry
4. `ShowTelaShell.tsx` — WorkspaceSwitcher in Profile tab + activeShowTelas prop
5. `ShowTelaRuntime.tsx` — pass activeShowTelas
6. `showtela/page.tsx` — fetch + pass activeShowTelas
