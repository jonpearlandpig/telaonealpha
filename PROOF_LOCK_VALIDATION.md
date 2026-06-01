# PROOF LOCK VALIDATION

Date: 2026-05-31

Branch:
- `proof-lock`

Source branch:
- `showtela-june1-rc1`

Workspace:
- `proof-lock-20260531-161702`

Founder workflow executed:
- Anchor Upload: PASS
- Calendar Upload: PASS
- Rider Upload: PASS

Validation:
- Automatic hydration: PASS
- People creation: FAIL
- Calendar creation: FAIL
- Operations creation: FAIL
- Feed creation: FAIL
- Persistence: FAIL

Observed final state:
- Uploaded artifacts persisted: `3`
- Replay observed event count: `30`
- Replay converged: `true`
- Deterministic restoration: `true`
- Hydrated people count: `0`
- Hydrated operations count: `1`
- Hydrated feed count: `1`
- Hydrated calendar event count: `0`

Observed rendered result:
- Active ops: `[]`
- Operations: `["ocid:showtela:2026-05-31:continuity"]`
- Feed: `["1 file added to continuity"]`
- Calendar: `[]`

Persistence evidence:
- Durable artifacts were present after reload: PASS
- Canonical snapshot persistence: FAIL
- Canonical object persistence: FAIL

Runtime errors observed during validation:
- `Could not find the 'latest_event_at' column of 'durable_snapshots' in the schema cache`
- `Could not find the 'augmented_at' column of 'operational_objects' in the schema cache`

PR87_CONFLICT_AUDIT.md review:
- Reviewed: PASS

Overall:
- FAIL

Conclusion:
- The June 1 proof is not repeatable from a clean workspace in the current state.
