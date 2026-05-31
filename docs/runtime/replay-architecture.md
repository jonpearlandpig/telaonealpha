# Replay Architecture

Date: 2026-05-27

## Separation Doctrine

The runtime has four distinct replay-adjacent layers. They are not interchangeable.

### 1. Runtime Events

`runtime_events` is the constitutional lineage substrate.

Responsibilities:

- append-only event persistence
- replay ordering substrate
- escalation lineage substrate
- rollback lineage substrate
- execution lineage substrate

### 2. Replay Integrity

Primary surface:

- `/api/runtime/replay`

Responsibilities:

- deterministic reconstruction verification
- checksum comparison
- convergence inspection
- drift detection inputs

This layer answers:

- Did replay converge?
- Is reconstruction deterministic?
- Did restoration drift?

It does not answer:

- What happened operationally?

### 3. Continuity Replay

Primary surface:

- `/api/runtime/continuity/replay`

Responsibilities:

- structural operational history reconstruction
- replay-frame generation
- escalation visibility
- operational “what happened?” answers

This layer answers:

- What happened since yesterday?
- Which escalations remain unresolved?
- Which structural runtime events occurred in sequence?

It does not generate:

- narrative summaries
- semantic reconstruction
- speculative operational interpretation

### 4. Replay Observability

Primary modules:

- `src/lib/runtime/replay/replayObservability.ts`
- `src/lib/runtime/replay/replayConvergence.ts`
- `src/lib/runtime/replay/replayDrift.ts`

Responsibilities:

- convergence telemetry
- reconstruction health
- deterministic restoration visibility

## Current Reconstruction Path

`runtime_events`
→ `eventStore.ts`
→ `reconstructOperationalStateFromReplay()`
→ continuity replay / operational state / observability layers

Continuity replay currently derives replay frames from persisted runtime events ordered by `replaySequence`.

## Current Verification Reality

Verified:

- deterministic replay route is stable across restart
- continuity replay route is stable across restart
- empty replay state remains truthful and deterministic

Blocked locally:

- persisted live-event replay verification because Supabase configuration is missing

## Continuity Replay Output Rules

Continuity replay frames must remain structural:

- event type
- action
- governance state
- execution state
- blockers
- escalation target
- lineage reference

Continuity replay must not manufacture:

- assistant prose summaries
- intent reconstruction
- inferred motivations
- synthetic continuity

## Restart-Survival Status

Observed on 2026-05-27:

- replay checksum remained stable across process restart
- replay route preserved:
  - `replayConverged: true`
  - `deterministicRestoration: true`
  - `observedEventCount: 0`

That proves route-level deterministic restart survival for the currently available event set.

It does not prove persisted replay survivability for live runtime traffic until Supabase-backed runtime events are available in the environment.
