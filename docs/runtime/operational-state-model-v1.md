# Operational State Model v1

## Derivation Hierarchy

`runtime_events`
→ replay reconstruction
→ operational graph
→ dependency analysis
→ state derivation
→ operational projections
→ hydration
→ ViewModel
→ UI

Operational truth does not derive from ViewModels. ViewModels render a hydrated projection that was already computed from replay-safe runtime inputs.

## State Lifecycle

`entered`
→ `acknowledged`
→ `escalated`
→ `resolved`
→ `superseded`
→ `expired`

Lifecycle labels describe the current projection state of an operational condition. Canonical truth remains in `runtime_events`.

## Projection Rules

Operational states are:

- derived
- recomputable
- replay-safe
- explainable

Operational states are not canonical truth. They are materialized projections derived from replayed runtime state and dependency topology.

## Explainability Requirements

Every operational state must carry:

- derivation source
- reasoning chain
- source events
- dependency lineage

If a state cannot explain why it exists, it should not be trusted as runtime cognition.

## Dependency Model

Operational truth emerges from linked operational chains:

- A blocked by B
- B waiting on C
- C awaiting external commitment

Dependency-aware state derivation is required so blockers, movement, readiness, and escalation remain topology-aware rather than isolated row summaries.
