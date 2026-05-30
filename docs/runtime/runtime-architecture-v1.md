## Runtime Architecture V1

Session 2A establishes an append-only constitutional runtime spine under TELAOne / ShowTELA.

### Runtime Truth Path

`runtime_events -> replay engine -> operational state -> snapshots -> view model -> UI`

The UI is no longer treated as runtime truth. React memory and local storage remain non-authoritative.

### Boundary Rules

- `eventBus.ts` is responsible only for event creation, dispatch, and subscriptions.
- `eventStore.ts` is responsible only for append-only persistence and read access for replay.
- `bootstrap.ts` wires the two together through subscriptions.
- Governance legality is evaluated before execution by `flightpath/legalityEngine.ts`.
- Enforcement outcomes are emitted through the runtime spine by `garvis/enforcement.ts`.
- Deterministic operator routing is produced by `mose/routing.ts`.

### Event Contract

All runtime events carry:

```ts
{
  id: string
  type: string
  eventVersion: number
  schemaVersion: string
  source: 'user' | 'system' | 'operator' | 'automation'
  governanceState: string
  executionState: string
  traceId?: string
  correlationId?: string
  lineageId?: string
  payloadType?: string
  createdAt: string
}
```

Payloads remain event-specific, but replay ordering is always based on append-only event records ordered by `created_at`, then `id`.

### Persistence Model

The following tables extend the existing durable continuity storage:

- `runtime_events`
- `operational_objects`
- `routing_plans`
- `enforcement_actions`
- `lineage_graph`

`runtime_events` is the replay source of truth for runtime reconstruction. The supporting tables exist for operator routing, governance enforcement, and lineage graph durability without coupling those concerns into event dispatch.

### Replay Safety

- Event IDs use `crypto.randomUUID()`.
- Event bus dispatch uses `Promise.allSettled()` so one handler failure never aborts the runtime.
- Persistence failures are non-fatal and logged safely.
- Replay reconstruction remains deterministic by sorting on event timestamp and ID.

### Session 2A Integration

- Inbox promotion emits `continuity.ingested` and `continuity.normalized`.
- The runtime bus persists those events through the bootstrap subscription.
- Existing constitutional events, durable artifacts, durable entities, and durable snapshots remain intact and continue to power Session 1 behavior.
