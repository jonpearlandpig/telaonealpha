# SHOWTELA Lifecycle Plan

Date: 2026-05-31

Scope:
- Phase 1 only
- Planning only
- No schema changes
- No migrations
- No persistence rewrites
- No hydration rewrites
- Internal `workspace` / `workspaceId` remains unchanged

## Objective

Move founder-facing product language and lifecycle from technical `workspace` semantics to ShowTELA semantics.

Founder-facing lifecycle for Phase 1:
- Build ShowTELA
- Open ShowTELA
- Archive ShowTELA

Internal implementation remains:
- `workspace`
- `workspaceId`
- existing query, persistence, and hydration behavior

## Review of `SHOWTELA_LANGUAGE_AUDIT.md`

Key conclusions carried forward:
- Biggest blast radius is founder docs and founder-readable operational artifacts.
- In-product visible copy is mostly clean already.
- The main product leak is not labels on screen. It is founder-visible URL semantics such as `?workspace=...`.
- There is no current founder-facing Build / Open / Archive surface to migrate yet, which makes Phase 1 mostly additive and low-risk if kept shallow.

## Phase 1 Definitions

### Build ShowTELA

Founder meaning:
- Create a new operational environment for a show, tour, or season.

Founder flow:
- Build ShowTELA
- Name ShowTELA
- Verify Empty State
- Open ShowTELA
- Add Continuity

Internal implementation meaning:
- Create a new internal `workspace` identity and route into `/showtela`.
- Do not change database schema.
- Do not change persistence model.

Phase 1 product promise:
- A newly built ShowTELA opens with a clean operational state.
- It contains no inherited continuity, entities, artifacts, or runtime events.

### Open ShowTELA

Founder meaning:
- Enter an existing ShowTELA and continue working inside it.

Internal implementation meaning:
- Resolve a founder-facing ShowTELA identity to an internal `workspaceId`.
- Route into existing ShowTELA runtime using current plumbing.

Phase 1 product promise:
- Opening a ShowTELA should never expose the term `workspace`.

### Archive ShowTELA

Founder meaning:
- Remove a ShowTELA from the active operating list without deleting it.

Required behavior:
- Read-only
- Hidden from active list
- Continuity preserved
- Replay preserved
- Searchable
- Recoverable
- No deletion
- No destructive mutation

Internal implementation meaning:
- This should be modeled first at the product surface and lifecycle-state layer, not by schema change in Phase 1.
- If archive cannot yet be made fully real without schema work, Phase 1 should define and gate the UI/flow but not over-promise implementation depth.

## Smallest Implementation Path

Phase 1 should be split into two tracks.

### Track A: Founder Language

This is the smallest, lowest-risk path and should happen first.

Changes:
- Replace founder-facing documentation language from `workspace` to `ShowTELA`.
- Replace founder-readable operational artifact language from `workspace` to `ShowTELA`.
- Rename lifecycle copy to:
  - `Build ShowTELA`
  - `Open ShowTELA`
  - `Archive ShowTELA`
- Avoid exposing `workspace` in founder help text, validation notes, and launch artifacts.

What stays unchanged:
- Query param names
- route handlers
- persistence internals
- hydration internals

### Track B: Founder Lifecycle Shell

This is the smallest product implementation path after language cleanup.

Changes:
- Introduce a founder-facing ShowTELA list surface.
- Add a founder-facing action to build a new ShowTELA.
- Add a founder-facing action to open a ShowTELA.
- Add a founder-facing action to archive a ShowTELA.

Important constraint:
- This shell should adapt to current internals, not replace them.
- A ShowTELA is a founder-facing wrapper over an internal `workspaceId`.

Phase 1 rule:
- Prefer thin translation layers over deep rewrites.

## Clean ShowTELA Creation

Definition of a clean ShowTELA:
- People: `0`
- Operations: `0`
- Calendar: `0`
- Continuity: `0`
- No prior entities
- No prior artifacts
- No prior runtime events
- No inherited replay state

Smallest implementation path:
1. Founder taps `Build ShowTELA`.
2. Founder provides a ShowTELA name.
3. System creates a brand-new internal `workspaceId`.
4. System routes to the existing ShowTELA page using current internals.
5. UI verifies empty operational state before inviting continuity ingest.

Internal note:
- This requires a reliable source of new internal IDs, but not a schema change.
- The new ShowTELA record can be represented in existing application-level routing/config state for Phase 1 if such a layer already exists, or added as a thin app-level mapping artifact later.

## Empty-State Verification

Founder requirement:
- The founder should know the ShowTELA is new and clean before adding continuity.

Smallest verification rule:
- Verify these counts on first open:
  - people `0`
  - operations `0`
  - calendar `0`
  - continuity `0`

Implementation shape:
- Reuse existing hydrated view model outputs.
- Do not change runtime hydration.
- Add a thin founder-facing verification surface that reads current counts and declares:
  - `Clean ShowTELA`
  - or `Not Clean`

Verification source for Phase 1:
- Existing `vm.activeOps.length`
- Existing `vm.crusadeOperations.length`
- Existing `vm.calendarEvents?.length ?? 0`
- Existing `vm.feed.length`

Acceptance logic:
- PASS only when all four are zero on first open for a newly created ShowTELA.
- FAIL if any count is non-zero.

## Archived ShowTELA Behavior

Founder behavior target:
- Archived ShowTELAs are removed from active operations but remain accessible and recoverable.

Phase 1 smallest path:
- Define archive as a lifecycle state in the founder shell first.
- Active list excludes archived ShowTELAs.
- Archived list exposes read-only access.
- Opening an archived ShowTELA keeps current runtime intact but disables founder editing actions at the surface level.

Important constraint:
- Because schema and persistence are out of scope, Phase 1 should avoid claiming permanent archive durability unless there is already an app-level store for this state.

Pragmatic Phase 1 recommendation:
- Implement archive only if a thin non-schema metadata layer already exists or can be added without persistence rewrites.
- Otherwise:
  - ship the language and lifecycle plan now
  - defer actual archive behavior to Phase 2
  - do not fake destructive archive behavior

## Founder Flow Target

Phase 1 target flow:
- Build ShowTELA
- Name ShowTELA
- Open ShowTELA
- Verify Empty State
- Add Continuity

Future flow after proof path:
- Build ShowTELA
- Name ShowTELA
- Open ShowTELA
- Add Continuity
- Upload Anchor Directory
- Upload Calendar
- Upload Rider
- ShowTELA Comes Alive

Archive flow target:
- Archive ShowTELA
- Move it out of active list
- Keep it recoverable

## Files Likely Affected

Highest-probability files for Phase 1:
- `FOUNDER_PROOF_RUNBOOK.md`
- `JUNE1_LAUNCH_CHECKLIST.md`
- `RELEASE_CANDIDATE_REPORT.md`
- `PROOF_LOCK_VALIDATION.md`
- `src/app/showtela/page.tsx`
- `src/components/showtela/ShowTelaShell.tsx`
- `src/app/showtela/venues/page.tsx`

Possible additional files depending on implementation choice:
- founder home / index route that will eventually list active ShowTELAs
- any routing helper introduced to map founder-facing ShowTELA identity to internal `workspaceId`
- any surface component that exposes share/open links

Files explicitly not targeted in Phase 1:
- persistence layer
- database schema files
- migrations
- hydration core
- ingestion core

## Risk Level

Overall Phase 1 risk:
- Language-only pass: LOW
- Founder route / URL cleanup: MEDIUM
- Build/Open lifecycle shell: MEDIUM
- Archive behavior: MEDIUM to HIGH if attempted without an existing metadata layer

Primary risks:
- Founder language gets cleaned up while `?workspace=` remains visible in links, producing an inconsistent mental model.
- “Build ShowTELA” could accidentally create a not-clean runtime if it points at reused internal state.
- “Archive ShowTELA” could over-promise behavior that is not durable without a persistence layer for lifecycle state.

## Dependencies

Required for Phase 1 language work:
- None beyond current repo surfaces

Required for Build ShowTELA:
- A reliable way to mint a fresh internal `workspaceId`
- A founder-facing naming step
- A route that opens that new ShowTELA through existing runtime plumbing

Required for Empty-State Verification:
- Existing hydrated view model counts
- An empty-state verification surface or banner

Required for Archive ShowTELA:
- A non-destructive lifecycle state representation
- An active list and archived list concept at the founder shell level
- A read-only mode at the product surface

## Acceptance Criteria

### Build ShowTELA
- Founder sees `Build ShowTELA`, not `workspace`.
- Founder can provide a ShowTELA name.
- A newly created ShowTELA opens into a clean state.
- Clean-state counts are:
  - People `0`
  - Operations `0`
  - Calendar `0`
  - Continuity `0`
- No inherited continuity, entities, artifacts, or events appear.
- Result is PASS / FAIL, not approximate.

### Open ShowTELA
- Founder sees `Open ShowTELA`, not `workspace`.
- Founder can open an existing ShowTELA from a founder-facing list or link.
- Opening the ShowTELA does not expose `workspace` in visible product copy.

### Archive ShowTELA
- Founder sees `Archive ShowTELA`, not `workspace archive`.
- Archived ShowTELA leaves the active list.
- Archived ShowTELA remains recoverable.
- Archived ShowTELA is read-only.
- No deletion occurs.
- Continuity and replay remain intact.

## Recommended Delivery Order

1. Founder language replacement in docs and founder-readable artifacts.
2. Founder-facing route/link semantics cleanup.
3. Build ShowTELA flow with clean-state verification.
4. Open ShowTELA founder list and naming semantics.
5. Archive ShowTELA only if non-destructive lifecycle state can be represented cleanly without violating scope.

## Plan Verdict

The smallest credible Phase 1 path is:
- clean up founder language first
- add a thin founder-facing ShowTELA lifecycle shell second
- defer any deep archive implementation unless a safe non-schema path already exists

This keeps scope aligned with:
- language
- lifecycle
- operational clarity

and avoids:
- schema work
- migration work
- persistence rewrites
- hydration rewrites
