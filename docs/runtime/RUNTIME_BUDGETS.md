# Runtime Budgets

**Classification:** Constitutional operational document.
**Authority:** Runtime Governance Lead, under `CONSTITUTIONAL_RUNTIME_RULES.md`.
**Purpose:** Define survivability constraints for the TELAOne / ShowTELA runtime. These are not performance targets. They are operational boundaries below which the runtime remains constitutionally sound.

> **No constitutional operation may block operational usability.**

Violating a hard constraint is a constitutional failure, not a performance regression.

---

## I. Hydration Latency

| Path | Target | Hard Constraint |
|------|--------|-----------------|
| SSR initial load (Supabase cache hit) | < 800ms | < 2000ms |
| SSR initial load (Notion cold fetch) | < 3000ms | < 8000ms |
| Client refresh (`/api/home-feed`) | < 3000ms | < 10000ms |
| Force refresh (`/api/showtela-force-refresh`) | < 6000ms | < 15000ms |
| Per-Notion-database query | < 1500ms | < 4000ms |

**Rules:**
- If SSR exceeds its hard constraint, serve `empty` state immediately. Do not make the operator wait for a broken hydration.
- If a Notion database query exceeds its hard constraint, that database's data is omitted from the payload for that request. The remaining databases proceed.
- Client refresh failure must not wipe existing rendered state. Prior operational state is preserved until a successful refresh replaces it.
- No hydration path may render a loading spinner for longer than 3 seconds without surfacing a diagnostic state label.

---

## II. Continuity Feed Size

| Measure | Target | Hard Constraint |
|---------|--------|-----------------|
| Events fetched per Notion database | 50 rows | 100 rows |
| Events in `continuityFeed` after thread merge | ≤ 30 | ≤ 50 |
| Events written to Supabase cache | ≤ 50 | ≤ 100 |
| Events rendered in the feed UI | ≤ 30 | ≤ 50 |
| Events in the Show Brief tab | ≤ 8 | ≤ 15 |
| Events in the Calendar tab | ≤ 10 | ≤ 20 |
| Events in `runtimeTimeline` | ≤ 20 | ≤ 30 |

**Rules:**
- Feed truncation is applied after sorting by recency. Oldest events are dropped first.
- Truncated events must not be silently discarded — the count of omitted events should be logged at the hydration layer.
- Thread merging (`threadContinuity`) must not produce a merged feed larger than the pre-merge feed. Merging is a reduction operation.

---

## III. Cache Payload Size

| Measure | Target | Hard Constraint |
|---------|--------|-----------------|
| Full snapshot JSON payload (`showtela-home-snapshot`) | < 100KB | < 250KB |
| Per-person row payload | < 2KB | < 5KB |
| Per-operation row payload | < 2KB | < 5KB |
| Per-event row payload | < 3KB | < 8KB |
| Per-unresolved row payload | < 1KB | < 3KB |
| Total rows written per cache flush | ≤ 120 | ≤ 200 |

**Rules:**
- If the snapshot payload exceeds its hard constraint, the write is rejected and an error is logged. A failed write due to size is preferable to writing a payload that cannot be reliably read.
- Image URLs are stored as URL strings, not as base64-encoded data. No binary content enters the cache payload.
- The cache snapshot does not include inference output (Claude-normalized text, extracted entities) unless that output has been promoted to canonical status via the promotion pipeline.

---

## IV. Normalization Scope

| Operation | Per-run limit | Hard Constraint |
|-----------|--------------|-----------------|
| Events normalized per promotion run | 1 (newest inbox item) | 1 |
| Claude Haiku calls per promotion | 1 | 1 |
| Claude Sonnet calls per Pearl Drop | 1 | 1 |
| Max transcript length submitted to Claude | 2000 chars | 4000 chars |
| Max normalized summary length | 220 chars | 500 chars |
| Max normalized headline length | 60 chars | 80 chars |
| Max action items extracted | 5 | 10 |
| Max entities extracted | 10 | 20 |
| Max tags extracted | 4 | 6 |

**Rules:**
- Normalization operates on one item at a time. Batch normalization is not permitted without explicit sovereign authorization and a defined scope limit.
- If a Claude normalization call fails or times out, the fallback path must produce a valid continuity object from the raw input — without Claude. A failed normalization must not produce an empty or missing record.
- Normalization output is `volatile` until written to the canonical store (Notion Continuity DB via the promotion pipeline). It does not become canonical by sitting in Supabase.
- Claude call timeout: 8000ms. If exceeded, use fallback.

---

## V. Mobile Memory Posture

| Measure | Target | Hard Constraint |
|---------|--------|-----------------|
| Initial JS payload delivered to client | < 200KB gzipped | < 400KB gzipped |
| Images loaded per feed render (above the fold) | ≤ 3 | ≤ 6 |
| Concurrent image loads at any time | ≤ 4 | ≤ 8 |
| Sheet components mounted simultaneously | ≤ 1 | ≤ 2 |
| Client-side state objects tracked in React | ≤ 5 top-level | — |

**Rules:**
- Feed images are loaded lazily. Only images within the visible viewport are fetched on render.
- Fallback images (Unsplash URLs in `ContinuityCard`) are external dependencies. They are permitted as a display fallback only. They must not be cached by the runtime or treated as provenance-linked assets.
- Audio recording streams (`MediaRecorder`, `SpeechRecognition`) must release hardware immediately after use. No stream reference may be retained after the recording or transcription phase completes.
- Pearl Drop voice interface must tear down all hardware streams on close, regardless of state. No dangling audio contexts are permitted.

---

## VI. Supabase Write Behavior

| Measure | Target | Hard Constraint |
|---------|--------|-----------------|
| Cache flush latency (write path) | < 1500ms | < 5000ms |
| Rows per cache flush | ≤ 120 | ≤ 200 |
| Retry attempts on write failure | 0 (log and fail) | 1 |
| Concurrent Supabase writes from one request | ≤ 1 batch upsert | ≤ 1 batch upsert |

**Rules:**
- SSR hydration writes to Supabase asynchronously (fire-and-forget). A write failure during SSR must not fail the page render.
- Force-refresh and promotion routes write synchronously. A write failure in these paths is reported in the response.
- No Supabase write may occur on the client side. All writes originate from server-side routes.
- Demo data, mock data, and inference-only data must not enter the canonical cache. The cache accepts only Notion-sourced or promoted records.
- Write failures are logged with the error message and the workspace + row ID attempted. Silent failures are prohibited.

---

## VII. Reconstruction Limits

Thread merging, ViewModel construction, and feed reconstruction are bounded operations. They must complete synchronously, without I/O, and within the limits below.

| Operation | Input limit | Hard Constraint |
|-----------|------------|-----------------|
| `threadContinuity()` — events grouped | ≤ 100 | ≤ 200 |
| `buildShowTelaVM()` — data mapped | ≤ 200 objects total | ≤ 400 objects total |
| Shell feed reconstruction (line 26 transform) | ≤ 50 items | ≤ 100 items |
| `pressureDelta` computation in `runtimeTimeline` | ≤ 20 events | ≤ 30 events |
| Merge body length per thread cluster | ≤ 500 chars | ≤ 1000 chars |

**Rules:**
- Reconstruction functions take typed input and return typed output. They perform no I/O, no inference calls, and no async operations.
- A reconstruction function that receives input exceeding its hard constraint must truncate at the boundary, log the truncation count, and continue. It must not throw.
- Thread merge clusters that exceed the merge body limit are truncated with a trailing indicator (` … [N more]`). The individual source event IDs must remain in the merged record for lineage traceability.

---

## VIII. Explainability Preservation

| Requirement | Rule |
|-------------|------|
| Source label | Every `ShowTelaHomeData` object must carry `source: 'notion' \| 'supabase' \| 'empty'` |
| Diagnostic state | Every hydrated object must carry `diagnosticState` |
| Hydration summary | Every hydration path must produce a `ShowTelaHydrationSummary` |
| Provenance on cache rows | Every Supabase row must carry a `provenance` object with `sourceType`, `sourceId`, `truthRank`, `lineageRefs` |
| Inference output label | Any field produced by Claude must be identifiable as inference output, not canonical fact |
| Discard log | Any record discarded during hydration (demo data guard, schema mismatch, size limit) must be logged |

**Rules:**
- Hydration diagnostics (`source`, `diagnosticState`, `hydration`) must not be stripped from the ViewModel before reaching the client. They are operational data, not debug data.
- A `truthRank` of `1.0` is reserved for Notion-sourced canonical records. Runtime-derived records use `0.8`. Inference-only records use `0.6` or lower.
- If explainability fields cannot be populated for a record, the record is `volatile` by definition and must not be promoted to `canonical`.

---

## IX. Derived-State Safety

| Rule | Description |
|------|-------------|
| No surface owns truth | Derived surfaces (feed cards, rails, pressure indicators) reflect truth. They do not define it. |
| No silent field loss | Fields present in `ShowTelaHomeData` must reach `ShowTelaViewModel` intact or be explicitly documented as intentionally dropped. |
| No pressure override without lineage | Pressure values from Notion may not be overridden by derived booleans without the Notion value being carried alongside for reference. |
| No merge without source IDs | Thread-merged records must carry the source event IDs of all contributing events. |
| No inference as final state | Inference output in the UI must be distinguishable from Notion-canonical output, either by label or by provenance metadata. |
| No empty state without diagnostic | Rendering empty arrays without a `diagnosticState` label is prohibited. Empty state must tell the operator why it is empty. |

---

## X. Forbidden Runtime Behaviors

These behaviors are constitutionally prohibited regardless of performance impact:

- **Blocking SSR on a slow inference call.** Claude calls must not be in the SSR critical path.
- **Silently serving stale state without a diagnostic label.** If the data is stale, the surface says so.
- **Merging thread clusters without retaining source event references.** Merging for display is permitted; destroying lineage is not.
- **Writing inference output to the canonical cache as if it were Notion-sourced.** Inference output is volatile until promoted through a defined, logged path.
- **Triggering a Notion fetch on every client interaction.** Notion is fetched on page mount and visibility change, not on tap, scroll, or sheet open.
- **Accumulating audio stream references across Pearl Drop sessions.** Each session has exactly one lifecycle; teardown is mandatory on close.
- **Serving `empty` state without logging why the empty state was reached.** Empty must be explainable.
