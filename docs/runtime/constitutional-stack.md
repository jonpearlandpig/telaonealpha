# Constitutional Stack

Date: 2026-05-27

## Stack Order

Current stack, from legality through execution:

1. Flightpath
2. Telauthorium / Pen & Sword
3. GARVIS
4. Pig Pen
5. MOSE
6. Execution Surfaces

## 1. Flightpath

Primary module:

- `src/lib/runtime/flightpath/legalityEngine.ts`

Responsibilities:

- legality checks
- authority floor checks
- governance-state legality
- next-action legality

Boundary:

- Flightpath determines whether an action is legally permissible.
- Flightpath does not persist continuity or execute UI actions.

Replay responsibility:

- legality outcomes become part of operator analysis and replay-derived legality state.

## 2. Telauthorium / Pen & Sword

Primary modules:

- `src/lib/constitutional/runtime/constitutionalMiddleware.ts`
- `src/lib/constitutional/runtime/constitutionalInvocation.ts`

Responsibilities:

- constitutional legitimacy
- authorship trace enforcement
- rights validation
- lineage reference generation

Boundary:

- Constitutional middleware validates legitimacy before runtime action execution.
- It is not the replay engine.

Replay responsibility:

- emits constitutional lifecycle events that become part of lineage reconstruction

## 3. GARVIS

Primary modules:

- `src/lib/runtime/garvis/enforcement.ts`
- `src/lib/runtime/garvis/rollback.ts`

Responsibilities:

- block unlawful execution
- propagate escalation
- enforce NIL protection
- enforce Two-Key protocol
- signal rollback lineage

Boundary:

- GARVIS enforces constitutional runtime law.
- GARVIS does not own legality calculation or routing selection.

Replay responsibility:

- emits block, escalation, and rollback events used by replay reconstruction

## 4. Pig Pen

Primary substrate:

- runtime operator registry and registry loaders

Representative modules:

- `src/lib/runtime/registry/registryLoader.ts`
- `public/data/pigpen-v5.2.json`

Responsibilities:

- operator registry topology
- capability boundaries
- module metadata
- health and validation surfaces

Boundary:

- Pig Pen defines operator availability and topology.
- Pig Pen is not the source of replay authority.

Replay responsibility:

- indirect only, through operator selection metadata and analysis outputs

## 5. MOSE

Primary module:

- `src/lib/runtime/mose/routing.ts`

Responsibilities:

- deterministic routing plan generation
- rollback class assignment
- escalation path selection
- selected-operator sequencing

Boundary:

- MOSE chooses route and sequence.
- MOSE does not enforce legality or constitutional rights.

Replay responsibility:

- routing plans are reconstructable from emitted operator-analysis payloads and derivations

## 6. Execution Surfaces

Current surfaces include:

- continuity ingest routes
- replay routes
- ShowTELA data routes
- TelaTalk replay question path

Boundary:

- execution surfaces expose runtime behavior to operators and UI
- execution surfaces do not own constitutional truth

Replay responsibility:

- surfaces must render replay-derived truth or truthful failure states

## Separation Rules

### Authority Boundary

- Flightpath decides legality.
- Constitutional middleware decides legitimacy.
- GARVIS decides enforcement outcomes.
- MOSE decides routing.
- Execution surfaces expose results.

### Replay Boundary

- replay integrity verifies deterministic reconstruction
- continuity replay reconstructs operational history
- runtime events remain the lineage substrate

### Execution Boundary

- execution surfaces must not invent continuity when persistence is missing
- degraded states must surface as degraded states

## Current Maturity

Most mature:

- legality + constitutional invocation boundaries
- GARVIS enforcement boundaries
- deterministic routing boundaries
- replay integrity separation

Less mature:

- live operational surfaces under degraded persistence
- durable event-spine verification in missing-env conditions
- founder/operator ergonomics around degraded runtime status
