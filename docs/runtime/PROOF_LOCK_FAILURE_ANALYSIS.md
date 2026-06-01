# PROOF LOCK FAILURE ANALYSIS

Date: 2026-05-31
Authority: Jon Hartman
Runtime: ShowTELA
Status: Diagnosis only

## Expected Result

The June 1 proof ShowTELA should replay from stored evidence after reload and answer:

- What happened
- When it happened
- What created it
- What changed it
- What was affected

Expected founder-visible result after Anchor, Rider, and Calendar uploads:

- People populated from the anchor directory
- Operations populated from the rider and directory
- Calendar events populated from the calendar artifact
- Continuity feed and replay timeline populated from persisted evidence
- Reload preserving the same operational state

## Actual Result

Founder workflow execution status from validation:

- Anchor Upload: PASS
- Calendar Upload: PASS
- Rider Upload: PASS
- Automatic hydration: PASS
- People creation: FAIL
- Calendar creation: FAIL
- Operations creation: FAIL
- Feed creation: FAIL
- Persistence: FAIL

Observed rendered result after reload:

- Active ops: `[]`
- Operations: `["ocid:showtela:2026-05-31:continuity"]`
- Feed: `["1 file added to continuity"]`
- Calendar: `[]`

## Evidence

Validation artifact: [PROOF_LOCK_VALIDATION.md](/Users/jonhartman/TELA/runtime/telaonealpha/PROOF_LOCK_VALIDATION.md:1)

Observed persisted counts:

- Uploaded artifacts persisted: `3`
- Replay observed event count: `30`
- Replay converged: `true`
- Deterministic restoration: `true`
- Hydrated people count: `0`
- Hydrated operations count: `1`
- Hydrated feed count: `1`
- Hydrated calendar event count: `0`

## Runtime Logs

Validation captured these runtime errors:

- `Could not find the 'latest_event_at' column of 'durable_snapshots' in the schema cache`
- `Could not find the 'augmented_at' column of 'operational_objects' in the schema cache`

These errors show replay-adjacent persistence derivations were calling columns that were not available in the active Supabase schema cache during proof validation.

## API Evidence

The runtime path used during proof hydration was the ShowTELA data route:

- [src/app/api/showtela-data/route.ts](/Users/jonhartman/TELA/runtime/telaonealpha/src/app/api/showtela-data/route.ts:1)

That route hydrates from:

- `hydrateRuntime(workspaceId)`
- `buildShowTelaVMFromHydratedState(state)`

The replay substrate itself was alive:

- [src/lib/runtime/eventStore.ts](/Users/jonhartman/TELA/runtime/telaonealpha/src/lib/runtime/eventStore.ts:1)
- [src/lib/runtime/replay/reconstructOperationalState.ts](/Users/jonhartman/TELA/runtime/telaonealpha/src/lib/runtime/replay/reconstructOperationalState.ts:1)

The failure was not absence of events. The failure was loss of founder-relevant projection from those events into the rendered ShowTELA state.

## Database Evidence

What persisted:

- `runtime_events` had replayable rows
- `durable_artifacts` had three uploaded artifacts

What failed at the database boundary:

- `durable_snapshots.latest_event_at` was missing from schema cache at validation time
- `operational_objects.augmented_at` was missing from schema cache at validation time

This meant canonical replay support was only partially durable during proof validation.

## Root Cause

Primary root cause:

- Proof uploads were being stored, but the founder-facing ShowTELA projection was not built from explicit ShowTELA continuity evidence events.

Contributing causes:

- Schema drift existed between code expectations and Supabase schema cache for replay-adjacent tables.
- The VM fallback path depended too heavily on generic replay decisions and artifact parsing instead of founder-readable, stored continuity events.
- The proof flow lacked explicit event records for upload and hydration milestones such as:
  - Anchor uploaded
  - People hydrated
  - Rider uploaded
  - Operations hydrated
  - Calendar uploaded
  - Calendar hydrated

Result:

- Replay infrastructure existed technically, but operational continuity was not replayable in founder terms.

## Confidence Level

High

Reason:

- The validation artifact shows persisted evidence existed.
- The runtime errors identify schema drift directly.
- The existing projection path before Session 7 did not store or render canonical ShowTELA continuity events for founder replay.
