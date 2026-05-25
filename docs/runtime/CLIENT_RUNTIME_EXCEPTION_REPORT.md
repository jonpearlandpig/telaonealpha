# Client Runtime Exception Report

**Classification:** Final micro-stabilization report.
**Scope:** ShowTELA client hydration.

## Exact Exception

Captured exception before fix:

```text
Error: Minified React error #418
```

React #418 indicates hydration failed because the client tree did not match the server-rendered HTML.

Captured stack:

```text
rD → oq → ik → iu → iX → MessagePort.w
/_next/static/chunks/4bd1b696-*.js
```

The production stack points into minified React/Next shared chunks, but the hydrated page source identified the mismatch source.

## Source Component

Source component:

```text
src/components/showtela/ActiveOpsRail.tsx
```

Cause:

The Active Ops rail rendered each person tile as a `<button>` and also rendered a Pearl Drop plus `<button>` inside it.

Nested buttons are invalid HTML. The browser reparses that markup before React hydrates, so React receives a DOM shape different from the server-rendered tree and throws hydration error #418.

## Severity

Severity: **runtime-significant**.

The page still rendered operational content, but hydration mismatch undermines client runtime confidence and can destabilize event binding.

Continuity data was not lost, but client behavior could not be considered clean while the exception was present.

## Fix Applied

The outer Active Ops tile was changed from a nested `<button>` to a keyboard-accessible interactive container:

- `role="button"`
- `tabIndex={0}`
- `onClick`
- `Enter` / `Space` keyboard activation

The inner Pearl Drop plus action remains a real `<button>`.

No styling redesign, interaction redesign, dependency change, or component abstraction was introduced.

## Runtime Risk Assessment

After the fix, local production browser validation captured:

- No `Runtime.exceptionThrown` events.
- No HTTP 4xx/5xx runtime responses.
- No blank state.
- No loading loop.
- ShowTELA content rendered normally.

Residual risk:

- A canceled network event remains present in headless Chrome as `net::ERR_ABORTED`, but it is marked `canceled: true` and did not affect rendered runtime state.
