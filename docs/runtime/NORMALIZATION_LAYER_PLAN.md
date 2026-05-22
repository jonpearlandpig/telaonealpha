# Normalization Layer Plan

## Why Normalization Is First Priority

Before entity extraction, continuity classification, or intelligence derivation can be trusted, the source data must be clean. Normalization is the prerequisite for everything downstream.

Without normalization:
- Entity extraction produces duplicates and fragments.
- Continuity classification operates on noise.
- Unresolved state cannot be reliably identified.
- Canonical memory is polluted with low-confidence volatile records.

Normalization does not require new infrastructure. It is a pipeline stage that runs before extraction and produces structured, consistent input for all downstream processes.

---

## Normalized Continuity Objects

A normalized continuity object is the standard unit of input to the extraction pipeline.

**Required fields:**
- `sourceId` — stable identifier for the origin record
- `sourceType` — enum: `transcript`, `message`, `note`, `artifact`, `summary`
- `timestamp` — ISO 8601, UTC
- `rawText` — original content, unmodified
- `normalizedText` — cleaned content (whitespace, encoding, PII scrub where policy requires)
- `lineageId` — inherited from parent ingest or newly assigned
- `provenance` — `{ source, confidence, authority }`
- `memoryTier` — `volatile` at entry; eligible for promotion to `canonical` after evaluation

**Optional fields:**
- `parentLineageId` — if this object continues a prior thread
- `threadRef` — explicit thread identifier when source carries one
- `unresolvedHint` — boolean flag set during normalization if unresolved markers are detected in raw text

---

## Transcript Cleanup Pipeline

Transcripts require additional cleanup before they are usable as normalized continuity objects.

**Steps:**
1. **Encoding normalization** — convert to UTF-8, strip null bytes and control characters.
2. **Whitespace normalization** — collapse runs of whitespace, normalize line endings.
3. **Speaker attribution** — identify speaker turns and assign consistent speaker labels.
4. **Timestamp alignment** — map per-turn timestamps to a single timeline where available.
5. **Filler removal** — strip transcript artifacts (repeated words, false starts) while preserving meaning.
6. **Segment boundary detection** — split into logical segments that correspond to topic or intent shifts.
7. **Segment-level normalization** — apply normalized continuity object schema to each segment.

Output: array of normalized continuity objects, one per segment, linked by `parentLineageId`.

---

## Operational Summaries

Operational summaries are derived from normalized continuity objects. They are not raw transcripts.

A valid operational summary:
- Covers a bounded time window or thread scope.
- States what happened operationally (decisions made, actions taken, commitments recorded).
- Identifies unresolved items explicitly.
- Preserves lineage references to source objects.
- Is stored as `volatile` until reviewed and promoted.

A summary must not:
- Omit unresolved state.
- Assert conclusions that are not supported by source objects.
- Substitute inference for documented operational fact.

---

## Entity Extraction

Entity extraction runs on normalized continuity objects after cleanup.

**Entity types extracted:**
- People (operators, stakeholders, named individuals)
- Operations (named projects, missions, initiatives)
- Artifacts (documents, outputs, deliverables referenced by name or ID)
- Organizations
- Locations (when operationally relevant)
- Dates and deadlines (when attached to commitments or unresolved items)

**Extraction output:**
- `entities[]` — each with `type`, `label`, `confidence`, `sourceRef` (normalized object ID)
- Entities are candidates until cross-referenced and confirmed — they enter memory at `volatile` tier.

**Deduplication:**
- Entities with matching labels and types from overlapping time windows are merged by reference, not by overwrite.
- Conflicting entity records are flagged for Layer 5 audit rather than silently resolved.

---

## Unresolved Extraction

Unresolved items are the highest-priority extraction output. They represent the operational state that the runtime exists to preserve.

**Unresolved markers to detect:**
- Open questions ("who is responsible for...", "still need to...")
- Pending commitments ("will send", "need to follow up", "waiting on")
- Blocked dependencies ("can't proceed until", "blocked by")
- Deferred decisions ("will decide later", "tabled for now")

**Extraction output:**
- `unresolved[]` — each with `text`, `type` (question/commitment/dependency/deferred), `confidence`, `sourceRef`, `entityRefs[]`
- Unresolved items are stored at `volatile` tier until confirmed as still-active.

**Resolution tracking:**
- When a later normalized object contains resolution language for a known unresolved item, the extraction pipeline flags it for promotion or closure — not automatic resolution.

---

## Pressure Derivation

Pressure signals indicate operational urgency without requiring explicit deadlines.

**Pressure indicators:**
- Deadline proximity (derived from date entities and current timestamp)
- Frequency of mention (entity or unresolved item appearing across multiple sources in a short window)
- Authority level of source (sovereign or governance-level source increases pressure weight)
- Explicit urgency language ("critical", "blocking", "immediately")

**Pressure output:**
- `pressureScore` — numeric 0–1 assigned to unresolved items and active operations
- `pressureFactors[]` — list of contributing signals with individual weights

Pressure score is a continuity classification input, not a display directive. UI surfaces may consume it but do not define it.

---

## Continuity Classification

Continuity classification assigns each normalized continuity object a role in the operational picture.

**Classes:**
- `active` — ongoing thread or operation with open unresolved items
- `resolved` — thread or operation with no remaining unresolved items
- `stalled` — active thread with no recent activity and unresolved items remaining
- `archived` — closed, resolved, and no longer operationally relevant
- `volatile` — insufficient confidence for classification; holds at intake

**Classification rules:**
- Classification is assigned after entity extraction and unresolved extraction.
- Classification is re-evaluated on each new normalized object in the same thread.
- Classification changes are recorded as lineage events, not overwrites.
- `canonical` promotion requires classification of `active`, `resolved`, or `stalled` with confidence above threshold.
