# Runtime Events

Date: 2026-05-27

## Event Authority

`runtime_events` is now the constitutional authority substrate for:

- replay reconstruction
- escalation lineage
- rollback lineage
- orchestration lineage
- execution lineage
- continuity reconstruction

If runtime truth cannot be reconstructed from the event spine, it is not constitutionally real.

## Ordering Rules

Authoritative ordering uses:

- persisted `replay_sequence` for replay reconstruction

Supporting historical docs that still describe `created_at` + `id` ordering are now incomplete for the current runtime reality and should be read as pre-stabilization context.

Current code paths sort replay reconstruction by:

- `event.replaySequence ?? 0`

## Core Event Categories

### Constitutional Invocation Events

Examples:

- `constitutional.invoked`
- `constitutional.validated`
- `constitutional.legitimacy.confirmed`
- `constitutional.audit.logged`

Purpose:

- record legitimacy checks before operator execution

### Operator / Orchestration Events

Examples:

- `operator.invoked`
- `operator.analysis.completed`
- `operator.recommendation.generated`
- `operator.execution.approved`
- `operator.execution.completed`

Purpose:

- preserve orchestration and execution lineage

### Enforcement / Governance Events

Examples:

- `operator.blocked`
- `operator.escalated`
- `governance.nil.blocked`
- `governance.two-key.blocked`
- `governance.escalation.propagated`
- `governance.escalation.resolved`

Purpose:

- preserve constitutional enforcement decisions
- preserve escalation pressure across replay

### Continuity Events

Examples:

- `continuity.ingested`
- `continuity.normalized`

Purpose:

- preserve operational continuity intake as replay-safe runtime lineage

### Rollback Events

Example:

- `runtime.rollback.signaled`

Purpose:

- preserve rollback classification and escalation state

## Escalation Lineage

Escalation lineage now depends on append-only events:

- propagation:
  `governance.escalation.propagated`
- resolution:
  `governance.escalation.resolved`

Reconstruction rule:

- unresolved escalations are derived from propagated escalations minus resolved escalations

This is the current constitutional path for escalation persistence.

## Rollback Lineage

Rollback lineage currently depends on:

- `runtime.rollback.signaled`

Critical rollbacks additionally trigger escalation propagation.

Current status:

- rollback classification and escalation signaling are implemented
- full side-effect reversal is not implemented

## Orchestration Lineage

Orchestration lineage currently reconstructs from:

- constitutional invocation events
- operator lifecycle events
- routing-plan derivations
- legality derivations

This provides causal visibility into:

- what was invoked
- what was analyzed
- what was recommended
- what was approved
- what was blocked

## Execution Lineage

Execution lineage currently reconstructs from:

- `operator.execution.approved`
- `operator.execution.completed`
- blocked/escalated enforcement outcomes

Execution lineage is therefore visible as event flow, not only as UI state.

## Continuity Reconstruction Flow

Current flow:

`continuity ingest`
→ constitutional validation
→ orchestration
→ event emission
→ append-only persistence when available
→ replay reconstruction
→ operational projection / continuity replay / observability

## Current Reality Anchor

What is true right now:

- Event semantics matter materially to replay.
- Replay separation must be preserved.
- Missing Supabase configuration currently prevents live event persistence in this local environment.
- In degraded mode, event emission still occurs in-process, but replay authority cannot rely on those events after process exit because they are not durably stored.
