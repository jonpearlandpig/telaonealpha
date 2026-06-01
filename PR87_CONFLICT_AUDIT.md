# PR #87 Conflict Audit

Date: 2026-05-31

Scope:
- Audit only
- No merge performed
- No conflict resolution performed
- No application code changed

Branches audited:
- `main` at `f71cb20d67afc5274398a3a67739697fcf8b0f6c`
- `showtela-june1-rc1` at `e6adece3ac8f1b2f6a223d76aa69f00194092521`
- merge base: `035dc2306f78f053fe2818177f8050dc2acbdeb0`

Method:
- Derived manual-conflict files from `git merge-tree` against the merge base.
- Only files reported as `changed in both` are included below.

Conflicted files:
1. `package.json`
2. `src/components/showtela/ShowTelaRuntime.tsx`
3. `src/components/showtela/types.ts`
4. `src/lib/showtela/buildViewModel.ts`
5. `src/lib/showtela/types.ts`

## 1. `package.json`

Main changes:
- Adds `"test": "node --import tsx --test src/**/*.test.ts src/**/*.test.mts"`.
- Keeps `"operator": "tsx --env-file .env.local operator/index.ts"`.
- Last touch on `main`: `f71cb20` on 2026-05-27 14:56:44 -05:00.

ShowTELA-June1-RC1 changes:
- Changes operator script to `"node --import tsx --env-file=.env.local operator/index.ts"`.
- Adds narrower test script: `"node --import tsx --test src/**/*.test.mts"`.
- Last touch on `showtela-june1-rc1`: `3c6d295` on 2026-05-27 12:57:21 -05:00.

June 1 proof functionality:
- Neither side contains June 1 proof functionality here.
- This is tooling and test-entry configuration only.

Newer work:
- `main` is newer by last-touch timestamp.

Exact risk if accepting `main`:
- Keeps broader test coverage by including both `*.test.ts` and `*.test.mts`.
- Drops the branch-local operator invocation normalization from the RC branch.
- If the proof workflow depends on the exact `node --import tsx --env-file=.env.local` form, that behavior is lost.

Exact risk if accepting `showtela-june1-rc1`:
- Narrows test discovery to `*.test.mts` and excludes `src/**/*.test.ts`.
- That creates immediate coverage drift for deterministic runtime tests restored on `main`.
- This does not directly harm the June 1 proof, but it weakens regression detection.

## 2. `src/components/showtela/ShowTelaRuntime.tsx`

Main changes:
- Adds `MOSEObservabilityPanel`.
- Continues client refresh from `/api/home-feed`.
- Extends refresh state merge to include `orchestrationRuns`.
- Keeps hydration diagnostics panel.
- Last touch on `main`: `4bcdf8e` on 2026-05-27 14:41:25 -05:00.

ShowTELA-June1-RC1 changes:
- Replaces callback-based refresh path with `hydrateFromServer()`.
- Switches fetch target to `/api/showtela-data?workspaceId=...`.
- Adds `workspaceId` prop requirement.
- Adds `clearStaleRuntimeSnapshot()` on mount.
- Adds realtime-driven refresh via `subscribeToContinuity()`.
- Adds `RuntimeDebugOverlay` based on `runtimeSnapshotMeta`.
- Passes `onHydrate` into `ShowTelaShell`.
- Last touch on `showtela-june1-rc1`: `e6adece` on 2026-05-31 12:39:44 -05:00.

June 1 proof functionality:
- `showtela-june1-rc1` contains the June 1 proof behavior.
- Evidence:
  - canonical snapshot awareness through `runtimeSnapshotMeta`
  - stale local snapshot clearing
  - workspace-scoped hydration
  - realtime continuity subscription
  - shell-triggered hydrate path
- `main` does not contain those proof-specific mechanics; it adds MOSE observability instead.

Newer work:
- `showtela-june1-rc1` is newer by last-touch timestamp and materially broader in scope.

Exact risk if accepting `main`:
- The June 1 proof runtime loses canonical-snapshot handling.
- The screen keeps polling `/api/home-feed` instead of hydrating from the proof-oriented `/api/showtela-data` path.
- Realtime continuity updates are lost.
- Any proof behavior depending on workspace-specific snapshot replacement or stale-local-state clearing is at risk of rendering old or incomplete state.

Exact risk if accepting `showtela-june1-rc1`:
- MOSE runtime observability panel is dropped from the merged result.
- `orchestrationRuns` surfaced by `main` no longer render in this component.
- Governance/execution debugging visibility regresses even if the June 1 proof UI stabilizes.

## 3. `src/components/showtela/types.ts`

Main changes:
- Imports `MoseRunSummary`.
- Adds optional `orchestrationRuns?: MoseRunSummary[]` to `ShowTelaViewModel`.
- Last touch on `main`: `4bcdf8e` on 2026-05-27 14:41:25 -05:00.

ShowTELA-June1-RC1 changes:
- Imports `ShowTelaRuntimeSnapshotMeta`.
- Imports `OperationalCalendarEvent`.
- Adds `runtimeSnapshotMeta?: ShowTelaRuntimeSnapshotMeta`.
- Adds `calendarEvents?: OperationalCalendarEvent[]`.
- Last touch on `showtela-june1-rc1`: `e6adece` on 2026-05-31 12:39:44 -05:00.

June 1 proof functionality:
- `showtela-june1-rc1` contains the proof-specific type surface.
- The proof branch needs `runtimeSnapshotMeta` for canonical snapshot status and `calendarEvents` for visible June 1 schedule rendering.
- `main` adds MOSE observability typing, not June 1 proof typing.

Newer work:
- `showtela-june1-rc1` is newer by last-touch timestamp.

Exact risk if accepting `main`:
- The proof runtime loses type support for snapshot metadata and operational calendar events.
- That is likely to break or block the June 1 proof path implemented elsewhere on the RC branch.

Exact risk if accepting `showtela-june1-rc1`:
- The merged type surface drops `orchestrationRuns`.
- `main`'s MOSE panel integration becomes type-invalid or invisible downstream.

## 4. `src/lib/showtela/buildViewModel.ts`

Main changes:
- Minimal change.
- Preserves the existing `buildShowTelaVM(data: ShowTelaHomeData)` path.
- Adds `orchestrationRuns: data.orchestrationRuns ?? []` into the returned view model.
- Last touch on `main`: `4bcdf8e` on 2026-05-27 14:41:25 -05:00.

ShowTELA-June1-RC1 changes:
- Large rewrite.
- Adds artifact parsing via:
  - `parseMarkdownDirectory`
  - `parseMarkdownCalendar`
  - local `parseMarkdownRider`
- Adds `collectArtifactViewData()` to derive people, operations, feed, and calendar data from uploaded proof artifacts.
- Adds `buildShowTelaVMFromHydratedState(state)` as the event-derived runtime path.
- Emits feed entries like:
  - `anchors uploaded`
  - `requirements uploaded`
- Adds `runtimeSnapshotMeta` construction.
- Adds `calendarEvents` population from parsed uploaded schedule data.
- Last touch on `showtela-june1-rc1`: `e6adece` on 2026-05-31 12:39:44 -05:00.

June 1 proof functionality:
- `showtela-june1-rc1` very clearly contains the June 1 proof functionality.
- This file is where the proof branch turns the three uploaded proof artifacts into the visible ShowTELA state:
  - anchor directory -> people and departments
  - calendar -> calendar events and feed items
  - rider -> department operations and rider requirement feed
- `main` does not contain this branch of behavior.

Newer work:
- `showtela-june1-rc1` is newer by last-touch timestamp and is the dominant implementation branch for this file.

Exact risk if accepting `main`:
- The June 1 proof functionality is effectively removed.
- Uploaded proof artifacts will not be transformed into the visible people/operations/calendar/feed state implemented on the RC branch.
- The canonical snapshot metadata path is also lost here.

Exact risk if accepting `showtela-june1-rc1`:
- `main`'s MOSE/orchestration view-model field injection is lost unless reapplied.
- Execution/governance observability can become invisible even though proof hydration works.
- This is the clearest example of a proof-vs-observability conflict.

## 5. `src/lib/showtela/types.ts`

Main changes:
- Imports `MoseRunSummary`.
- Adds `orchestrationRuns?: MoseRunSummary[]` to `ShowTelaHomeData`.
- Keeps `PressureLevel` as `'low' | 'medium' | 'high'`.
- Last touch on `main`: `4bcdf8e` on 2026-05-27 14:41:25 -05:00.

ShowTELA-June1-RC1 changes:
- Imports `OperationalProjection`.
- Expands `PressureLevel` to include `'critical'`.
- Broadens `ContinuityEvent` with fields such as:
  - `summary`
  - `rawTranscript`
  - `nextActions`
  - `classification`
  - `confidence`
  - `normalizedBy`
  - `normalizationVersion`
  - `sourceMode`
- Adds `runtimeSnapshotMeta?: ShowTelaRuntimeSnapshotMeta` to `ShowTelaHomeData`.
- Adds `operationalProjection?: OperationalProjection` to `ShowTelaHomeData`.
- Defines `ShowTelaRuntimeSnapshotMeta`.
- Last touch on `showtela-june1-rc1`: `d48a77a` on 2026-05-26 11:28:04 -05:00.

June 1 proof functionality:
- `showtela-june1-rc1` contains the type substrate needed by the proof path, especially `ShowTelaRuntimeSnapshotMeta`.
- `main` does not contain the proof snapshot type.
- However, the proof-specific implementation pressure is stronger in files 2 through 4 than in this file by itself.

Newer work:
- `main` is newer by last-touch timestamp.
- `showtela-june1-rc1` is broader in type surface, but not newer by commit time.

Exact risk if accepting `main`:
- Snapshot metadata and richer normalized continuity fields disappear from the shared data model.
- That creates structural incompatibility with the RC branch runtime and view-model code.
- The June 1 proof path becomes harder or impossible to type-cleanly support.

Exact risk if accepting `showtela-june1-rc1`:
- `main`'s `orchestrationRuns` data contract disappears from `ShowTelaHomeData`.
- Any code expecting MOSE run summaries from the server loses its declared type support.
- `PressureLevel` semantics also diverge because `main` does not account for `'critical'`.

## Bottom Line

Where the June 1 proof functionality lives:
- Primarily on `showtela-june1-rc1`
- Strongest proof ownership:
  - `src/components/showtela/ShowTelaRuntime.tsx`
  - `src/components/showtela/types.ts`
  - `src/lib/showtela/buildViewModel.ts`
  - `src/lib/showtela/types.ts`
- `package.json` is not proof-specific

Where the newer work lives:
- `package.json`: `main`
- `src/components/showtela/ShowTelaRuntime.tsx`: `showtela-june1-rc1`
- `src/components/showtela/types.ts`: `showtela-june1-rc1`
- `src/lib/showtela/buildViewModel.ts`: `showtela-june1-rc1`
- `src/lib/showtela/types.ts`: `main` by timestamp, `showtela-june1-rc1` by breadth

Highest merge-resolution risk areas:
- Accepting `main` wholesale drops the June 1 proof hydration/snapshot/artifact-derived rendering path.
- Accepting `showtela-june1-rc1` wholesale drops MOSE orchestration observability added on `main`.

This audit makes no recommendation to merge either side as-is.
