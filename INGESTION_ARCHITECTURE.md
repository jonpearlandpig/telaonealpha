# TELAOne Ingestion Architecture

This document defines the canonical ingestion architecture for the continuity-first runtime.
It extends (and does not duplicate) the constitutional doctrine in `AGENTS.md`.

## Runtime Intent
- **Entity-first ingestion**: entities are extracted before continuity chunking so retrieval can hydrate operational context by actor/object, not only by document text.
- **Continuity preservation**: unresolved state, thread references, and lineage are persisted as ingestion metadata.
- **Canonical vs volatile memory separation**: durable records are marked by authority confidence and memory tier to avoid polluting canonical memory with volatile updates.
- **Operational lineage**: each ingest creates or inherits a lineage chain that can be traced through continuity restoration.

## Pipeline Stages
1. **Source acquisition**
   - Acquire source payload (`source`, `payloadRef`, timestamp, optional parent lineage).
2. **Provenance formation**
   - Build provenance record (`lineageId`, continuity chain, authority confidence).
3. **Entity-first extraction**
   - Extract entity graph candidates and unresolved indicators.
4. **Continuity chunking**
   - Chunk content with entity references and provenance references.
5. **Memory tier assignment**
   - Assign `canonical` tier only for high-confidence stable operational records.
   - Assign `volatile` tier for refresh/transient records pending promotion.
6. **Queue scheduling & retry**
   - Process jobs with deterministic transitions and retry policy.
7. **Continuity hydration hooks**
   - Emit snapshot seed (thread, unresolved hint, lineage confidence, memory tier).

## Data Contracts (high level)
- Ingest output must include:
  - `lineageId`
  - `entities[]`
  - `chunks[]`
  - `continuitySnapshotSeed` with unresolved and confidence hints
  - `memoryTier` (`canonical` | `volatile`)

## Promotion Rules (volatile → canonical)
- Promote only when:
  - unresolved thread state has stabilized,
  - provenance confidence is above threshold,
  - lineage continuity is intact,
  - no conflicting higher-authority canonical record exists.

## Non-goals
- No dashboard-first ingestion controls.
- No runtime destabilization through broad architectural rewrites.
- No duplication of constitutional governance text.
