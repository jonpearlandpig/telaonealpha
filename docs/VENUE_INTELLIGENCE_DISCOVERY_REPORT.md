# SHOWTELA VENUE INTELLIGENCE
## DISCOVERY REPORT — PHASE 0

**Date:** 2026-05-31  
**Branch:** `claude/showtela-discovery-phase-0-OE3Gy`  
**Status:** COMPLETE — No code changes made. Report only.  
**Scope:** Full repository analysis prior to Venue Intelligence implementation.

---

## STOP CONDITION ASSESSMENT

No architectural conflicts found. No stop required.

The repository analysis reveals that **venue is an already-anticipated first-class entity** in the operational ontology. The implementation gap is not architectural — it is a missing extraction layer and missing UI layer over a correctly designed substrate.

**Recommendation: Proceed to implementation.**

---

## SECTION 1: EXISTING ARCHITECTURE

### 1.1 Database Layer

**Location:** `supabase/migrations/` + `src/lib/supabase/schema.ts`

| Table | Purpose | Venue-Relevant? |
|-------|---------|----------------|
| `durable_artifacts` | Document storage with provenance metadata | YES — rider PDFs ingest here |
| `durable_entities` | Entity records (any type, stored as string) | YES — venue entities persist here |
| `durable_snapshots` | Operational state checkpoints | Indirect |
| `runtime_events` | Append-only event log for state reconstruction | YES — venue events log here |
| `operational_states` | Derived state projections per entity | YES — venue pressure/state lives here |
| `lineage_graph` | Relationship edges between entities/events | YES — rider-to-venue lineage |
| `operational_objects` | Canonical operational objects | YES — venue objects normalize here |
| `constitutional_events` | Append-only governance event log | YES — venue intelligence decisions log here |
| `routing_plans` | Governance routing decisions | Indirect |

**Key schema observations:**
- `durable_entities.type` is stored as `string` — any entity type can be persisted including `venue` without a schema change
- `durable_artifacts` has `lineageId` and `artifactGroupId` fields — rider versioning is natively supported
- `ProvenanceMetadata` attaches to every artifact and entity row — all venue data carries lineage
- No `venue_id` foreign key exists anywhere — riders are not yet linkable to venues by ID
- No `is_active_rider` flag exists — active rider selection is not yet implemented

---

### 1.2 Document Ingestion Pipeline

**Location:** `src/lib/continuity/` + `src/app/api/parse-document/`

The ingestion pipeline is fully operational and handles production riders today.

```
File (PDF / DOCX / TXT)
  → POST /api/parse-document
  → pdf-parse (PDF) | mammoth (DOCX) | native (TXT/MD)
  → { text, charCount, fileName, mimeType }
  → documentClassifier.ts        ← classifies as 'production-rider'
  → riderExtractor.ts            ← extracts department names
  → documentIngest.ts            ← persists department entities
  → persistDurableContinuity()   ← writes to Supabase
  → ingestCanonicalContinuity()  ← emits RuntimeEvent
```

**Current rider processing result:** Departments extracted and stored as `EntityRecord` with type `context`, prefix `rider-dept:`. No venue entity is created. No specs are extracted. No active rider is tracked.

**Document classes currently supported:**
- `anchor-directory` → persons extracted
- `tour-calendar` → show dates extracted
- `production-rider` → departments extracted ← **venue intelligence extends this**
- `generic` → pass-through

---

### 1.3 Entity Architecture

**Location:** `src/lib/entities/entityEngine.ts` + `src/lib/runtime/ontology/`

**Critical finding:** Venue is a first-class type in the operational ontology.

`src/lib/runtime/ontology/operationalOntology.ts` defines a full registry entry:
```typescript
venue: {
  canonicalType: 'venue',
  allowedReplaySources: ['entity'],
  reconciliationStrategy: 'canonical-id-and-lineage',
  identityRequirements: ['canonical-object-id', 'entity-id'],
  promotionRequirements: ['approved-replay-event'],
  persistenceRequirements: ['stable-identity', 'lineage-safe-replay-confirmation'],
}
```

`src/lib/runtime/ontology/objectNormalization.ts` routes `venue:` prefixed entity IDs:
```typescript
if (entityId.startsWith('venue:')) return 'venue'
```

`src/lib/showtela/calendar.ts` references venue in show date extraction:
```typescript
| 'venue'
venue_advance: 'venue'
event.venue  // field present on extracted calendar events
```

**Gap:** `EntityType` union in `entityEngine.ts` includes `'location'` but not `'venue'`. This is the only type-safety gap. The ontology, ID routing, and calendar extraction are all venue-aware. Only the `EntityType` TypeScript union needs extending.

---

### 1.4 AI / LLM Systems

**Location:** `src/lib/ai/claude.ts`, `src/lib/continuity/llm-normalize.ts`

| System | Model | Purpose | Venue-Relevant? |
|--------|-------|---------|----------------|
| `llm-normalize.ts` | claude-haiku-4-5-20251001 | General document normalization | YES — `classification: 'venue'` is already a valid output |
| `anthropic.ts` | claude-sonnet-4-20250514 | Chat + system prompt | YES — buildSystemPrompt() injectable |
| `documentClassifier.ts` | Regex only | Document type detection | YES — extend with venue-profile patterns |
| `riderExtractor.ts` | Regex only | Department extraction from riders | YES — extend with spec extraction |

**Key finding:** `llm-normalize.ts` already returns `classification: 'venue'` as one of 11 valid outputs. The LLM layer anticipated venue classification. No new model integration is required — only a dedicated venue extraction prompt is needed.

---

### 1.5 Dashboard Architecture

**Location:** `src/app/showtela/` + `src/components/showtela/`

| Pattern | Location | Reuse Strategy |
|---------|----------|----------------|
| Main dashboard shell | `ShowTelaShell.tsx` | Add venue section to navigation |
| Bottom sheet system | `sheets/BottomSheet.tsx` | Create `VenueSheet.tsx` following same pattern |
| Card system | `ContinuityCard.tsx`, `DepartmentLoadCard.tsx` | Create `VenueCard.tsx` following same pattern |
| Detail pages | `/showtela/[showTelaId]/page.tsx` | Create `/showtela/venue/[venueId]/page.tsx` |
| Data API | `showtela-data/route.ts` → view model | Extend view model with venue data |
| Operation sheets | `OperationSheet.tsx`, `PersonSheet.tsx` | `VenueSheet.tsx` follows this exact pattern |

**Navigation:** The `BottomNav.tsx` and `TopNav.tsx` components provide the mobile navigation frame. Venue Intelligence will slot into this without structural changes.

---

### 1.6 Audit / Continuity Systems

**Location:** `src/lib/constitutional/`, `src/app/api/constitutional-events/`

- `constitutional_events` table is append-only (trigger-enforced). All venue intelligence events can log here under `event_type: 'artifact_generated'` or a new `'venue_profile_updated'` type.
- `RuntimeEvent` system: venue events will emit as `source: 'system'` events with `type: 'venue_entity_created'` or `'active_rider_set'`.
- `ProvenanceMetadata` on every artifact and entity row ensures all venue data carries full lineage from the moment of ingestion.
- `DurableSnapshot` system will checkpoint venue state automatically via the existing `persistDurableContinuity()` path.

No new audit infrastructure required. Venue intelligence integrates directly into the existing provenance architecture.

---

## SECTION 2: REUSABLE COMPONENTS

The following existing components can be used **without modification** for Venue Intelligence:

| Component | Location | How Reused |
|-----------|----------|-----------|
| `POST /api/parse-document` | `src/app/api/parse-document/route.ts` | Upload rider PDFs — no change needed |
| `documentClassifier.ts` | `src/lib/continuity/documentClassifier.ts` | Detects `production-rider` — extend, not replace |
| `riderExtractor.ts` | `src/lib/continuity/riderExtractor.ts` | Department extraction — extend with spec patterns |
| `documentIngest.ts` | `src/lib/continuity/documentIngest.ts` | Orchestration — extend the `production-rider` branch |
| `persistDurableContinuity()` | `src/lib/runtime/durableMemory.ts` | Persists venue entities + artifacts — no change |
| `durable_entities` table | Supabase | Stores venue entity rows — no schema change for basic use |
| `durable_artifacts` table | Supabase | Stores rider PDFs as artifacts — no schema change for basic use |
| `llm-normalize.ts` | `src/lib/continuity/llm-normalize.ts` | `venue` classification already returned — extend prompt for specs |
| `anthropic.ts` | `src/lib/ai/anthropic.ts` | Claude client — reuse directly |
| `BottomSheet.tsx` | `src/components/showtela/sheets/BottomSheet.tsx` | Shell for `VenueSheet.tsx` |
| `constitutional_events` table | Supabase | Venue governance events log here |
| `RuntimeEvent` system | `src/lib/runtime/runtimeTypes.ts` | Venue events emit here |
| `OperationalOntologyRegistry` | `src/lib/runtime/ontology/operationalOntology.ts` | Venue already registered — no change |
| `objectNormalization.ts` | `src/lib/runtime/ontology/objectNormalization.ts` | `venue:` prefix routing already implemented |
| `CalendarEventCard.tsx` | `src/components/showtela/CalendarEventCard.tsx` | Shows venue name from `event.venue` already |
| `deterministicArtifactId()` | `src/lib/artifacts/artifactStore.ts` | Deterministic IDs for rider artifacts |
| `createContinuityOcid()` | `src/lib/showtela/continuityRecord.ts` | OCIDs for venue continuity events |

---

## SECTION 3: REQUIRED NEW COMPONENTS

### 3.1 Extraction Layer (New Files)

| File | Location | Purpose |
|------|----------|---------|
| `venueExtractor.ts` | `src/lib/continuity/venueExtractor.ts` | LLM extraction of venue specs from rider text — stage dimensions, power, FOH, catering, dressing rooms, load-in times |
| `venueEntityFactory.ts` | `src/lib/entities/venueEntityFactory.ts` | Creates `EntityRecord` with type `venue` and id prefix `venue:` from extracted data |

### 3.2 Ingestion Extension (Extend Existing Files)

| File | Change |
|------|--------|
| `entityEngine.ts` | Add `'venue'` to `EntityType` union (type safety only — DB already accepts it) |
| `documentClassifier.ts` | Optionally add `'venue-profile'` class for standalone venue sheets; existing `'production-rider'` detection already sufficient |
| `documentIngest.ts` | In the `production-rider` branch: call `venueExtractor.ts`, create venue entity, write `venue_id` + `is_active_rider` columns |

### 3.3 API Routes (New)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/venue/[venueId]` | GET | Return venue entity + all rider artifacts + active rider + extracted specs |
| `/api/venue/set-active-rider` | POST | Accept `{ venueId, artifactId }` — mark one rider as active, clear others |

### 3.4 UI Components (New)

| Component | Location | Pattern Source |
|-----------|----------|----------------|
| `VenueSheet.tsx` | `src/components/showtela/sheets/VenueSheet.tsx` | Follows `OperationSheet.tsx` / `PersonSheet.tsx` |
| `VenueCard.tsx` | `src/components/showtela/VenueCard.tsx` | Follows `DepartmentLoadCard.tsx` |
| `VenueIntelligencePanel.tsx` | `src/components/showtela/VenueIntelligencePanel.tsx` | Composite: specs + active rider + departments + history |
| `ActiveRiderBadge.tsx` | `src/components/showtela/ActiveRiderBadge.tsx` | Small indicator for "active rider" state |

### 3.5 Pages (New)

| Page | Location | Purpose |
|------|----------|---------|
| Venue detail | `src/app/showtela/venue/[venueId]/page.tsx` | Full venue profile with active rider, specs, history |

### 3.6 Data Layer (New)

| File | Location | Purpose |
|------|----------|---------|
| `venueProfiles.ts` | `src/lib/showtela/venueProfiles.ts` | Builds rich venue view model from entity + artifacts |

---

## SECTION 4: REQUIRED DATABASE CHANGES

### 4.1 Phase 1 Migration — Active Rider Tracking

**Minimal schema change. Extend existing tables.**

```sql
-- Migration: venue_intelligence_v1

-- Enable active rider tracking on durable_artifacts
ALTER TABLE durable_artifacts
  ADD COLUMN IF NOT EXISTS venue_id TEXT,
  ADD COLUMN IF NOT EXISTS is_active_rider BOOLEAN DEFAULT FALSE;

-- Index for querying all riders for a venue
CREATE INDEX IF NOT EXISTS durable_artifacts_venue_idx
  ON durable_artifacts(venue_id)
  WHERE venue_id IS NOT NULL;

-- Index for finding the active rider per venue efficiently
CREATE INDEX IF NOT EXISTS durable_artifacts_active_rider_idx
  ON durable_artifacts(venue_id, is_active_rider)
  WHERE is_active_rider = TRUE;

-- Constraint: at most one active rider per venue per workspace
-- Enforced at application layer (set-active-rider route clears others before setting new)
```

**Why this approach:** Minimal blast radius. Extends existing `durable_artifacts` table with two nullable columns. All existing queries unaffected. No new table dependency chain.

### 4.2 Phase 2 Migration — Venue Profiles Table (Optional)

**When to apply:** After Phase 1 validates that venue entities are useful and specs are reliably extracted. Do not apply until Phase 1 is working and the spec schema is stable.

```sql
-- Migration: venue_profiles_v1

CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,           -- References durable_entities.id (venue: prefix)
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  capacity INTEGER,
  active_rider_artifact_id UUID REFERENCES durable_artifacts(id),
  technical_specs JSONB DEFAULT '{}', -- stage dims, power, FOH, load-in times, etc.
  contacts JSONB DEFAULT '[]',        -- advance contact, production manager, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provenance JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS venue_profiles_workspace_idx
  ON venue_profiles(workspace_id);

CREATE INDEX IF NOT EXISTS venue_profiles_entity_idx
  ON venue_profiles(entity_id);

ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
```

**Recommendation: Build Phase 1 with the durable_entities + durable_artifacts pattern first. Migrate to venue_profiles only once the spec schema is proven.**

---

## SECTION 5: RISKS

### Risk 1 — Rider PDF Format Variability
**Severity: HIGH**  
Production riders have no standard format. They range from structured spreadsheets to free-form PDFs to handwritten scans. Regex-only extraction (`riderExtractor.ts`) will miss specs in non-standard layouts.  
**Mitigation:** Use regex for department detection (already reliable). Use Claude Haiku for structured spec extraction (`venueExtractor.ts`). Accept partial extraction — partial data is better than no data. Log extraction confidence score.

### Risk 2 — Venue Entity Disambiguation
**Severity: MEDIUM**  
The same venue may appear as "The Fillmore", "Fillmore SF", "Fillmore San Francisco", and "Bill Graham Civic Auditorium" across different documents. Without fuzzy matching, duplicate venue entities will accumulate.  
**Mitigation:** Normalize venue entity IDs as `venue:{city-slug}:{name-slug}`. Add `aliases[]` field. Do not auto-merge — surface potential duplicates to the user for manual resolution. This is a Phase 2 problem; accept duplicates in Phase 1.

### Risk 3 — Active Rider Contention
**Severity: HIGH**  
Marking the wrong rider version as active in a live production context creates real operational risk. A stale rider with incorrect specs could cause equipment failures, catering gaps, or contract violations.  
**Mitigation:** Active rider promotion requires explicit user action via the `set-active-rider` API. Never auto-promote on upload. Display rider creation date and version clearly. Show diff indicator when a newer rider exists than the active one.

### Risk 4 — Database Payload Bloat from Large PDFs
**Severity: MEDIUM**  
The current system stores document text in `durable_artifacts.payload` as a string. Large production riders (multi-department, 50+ pages) can produce 50,000+ character payloads.  
**Mitigation:** Phase 1 — store extracted text only (not binary). Cap extraction at 12,000 chars (rider content is dense; this covers most real riders). Phase 2 — add Supabase Storage bucket for binary originals, store only the URL in payload.

### Risk 5 — EntityType Union Drift
**Severity: LOW**  
Adding `'venue'` to `EntityType` in `entityEngine.ts` requires auditing all switch statements and exhaustiveness checks on that union. Missing cases will produce silent runtime failures.  
**Mitigation:** Grep for `EntityType` usages before committing the change. The existing codebase has few switch statements on this union; the `entityEngine.ts` change is low-risk.

### Risk 6 — llm-normalize.ts Prompt Scope
**Severity: MEDIUM**  
The existing general normalization prompt is tuned for voice notes and operational updates — not structured technical extraction. Using it for venue spec extraction will produce unreliable results.  
**Mitigation:** Create a dedicated `venueExtractor.ts` with a precise JSON schema for venue specs. Do not extend the general normalization prompt. Keep the two extraction paths separate.

---

## SECTION 6: ASSUMPTIONS

1. **Venue Intelligence** means: extracting structured operational and technical data from production rider documents and surfacing it in the ShowTELA dashboard alongside show and operational context.

2. **A Venue is distinct from a generic location.** Venue carries production rider documents, technical specifications, department requirements, advance contacts, and show history. The existing `'location'` entity type in `entityEngine.ts` is for generic place-name extraction and is not the right substrate. Venue gets its own type: `'venue'`.

3. **Active Production Rider** = the single rider version currently in effect for a show or venue advance, selected by the user from potentially multiple uploaded versions. Selection is deliberate. It is never auto-promoted.

4. **Venue Intelligence lives within ShowTELA,** not as a separate module. It is a capability of the existing ShowTELA operational runtime, accessible from the same dashboard, navigation, and sheet system.

5. **The primary ingestion document type is the production rider PDF.** Venue profiles are built from rider documents. Standalone venue data entry is a Phase 2+ concern.

6. **Venues are linkable to show dates.** The calendar extraction system already extracts `event.venue` as a string from tour calendars. Phase 1 creates venue entities that these calendar references can resolve to.

7. **The operational ontology definition for venue is correct as-is.** `operationalOntology.ts` already defines venue with `'stable-identity'` and `'lineage-safe-replay-confirmation'` persistence requirements. No ontology changes needed.

8. **Binary PDF storage is deferred.** Phase 1 stores extracted text only. Binary originals are a Phase 2 concern once a Supabase Storage bucket is configured.

---

## SECTION 7: RECOMMENDED BUILD PLAN

**Governing constraint:** Prefer extension over replacement. Follow existing patterns exactly. Do not rebuild working systems.

---

### Phase 1A — Entity Foundation (No UI)

**Goal:** Venue entities created automatically when a production rider is ingested.

1. **Extend `EntityType`** — add `'venue'` to the union in `src/lib/entities/entityEngine.ts`. Audit all switch/exhaustiveness usage.

2. **Create `venueEntityFactory.ts`** — `src/lib/entities/venueEntityFactory.ts`. Builds an `EntityRecord` with type `'venue'`, id prefix `venue:{city-slug}:{name-slug}`, `authoritySource: 'document'`. Extracts venue name and city from rider content via regex (header parsing + common patterns: "Venue:", "Presented at:", city/state line patterns).

3. **Create `venueExtractor.ts`** — `src/lib/continuity/venueExtractor.ts`. Claude Haiku call (like `llm-normalize.ts`) with a precise JSON schema prompt. Extracts: `{ venueName, city, state, capacity, stageDimensions, powerSpec, fohDistance, loadInTime, loadOutTime, cateringRooms, dressingRooms, localCrewCall, advanceContact }`. Returns null on failure — extraction is best-effort, not blocking.

4. **Extend `documentIngest.ts`** — In the `production-rider` branch, after department extraction: call `venueEntityFactory.ts`, call `venueExtractor.ts`, write venue entity to `extraEntities`, write rider artifact with `venue_id` set. Does not break existing department extraction behavior.

5. **Run Phase 1A migration** — `supabase/migrations/{timestamp}_venue_intelligence_v1.sql`. Adds `venue_id` and `is_active_rider` to `durable_artifacts`.

**Test gate:** Upload a production rider PDF. Confirm: (a) departments extracted as before, (b) venue entity created in `durable_entities` with prefix `venue:`, (c) artifact row has `venue_id` set.

---

### Phase 1B — Active Rider API

**Goal:** Users can designate one rider as active per venue.

6. **Create `GET /api/venue/[venueId]/route.ts`** — Returns: venue entity from `durable_entities` + all `durable_artifacts` where `venue_id = venueId` + extracted specs from active rider payload.

7. **Create `POST /api/venue/set-active-rider/route.ts`** — Accepts `{ venueId, artifactId, workspaceId }`. Clears `is_active_rider` on all artifacts for that venue, sets it on the specified artifact. Emits a `RuntimeEvent` with `type: 'active_rider_set'`. Logs to `constitutional_events`.

**Test gate:** Upload two rider versions for the same venue. Confirm set-active-rider correctly marks one active and clears the other. Confirm event log entry created.

---

### Phase 1C — Venue Intelligence UI

**Goal:** Venues visible in ShowTELA dashboard. Active rider surfaced.

8. **Create `venueProfiles.ts`** — `src/lib/showtela/venueProfiles.ts`. Builds a `VenueViewModel` from entity + artifacts. Fields: `id, name, city, state, specs, departments, activeRider, riderHistory, pressure, linkedShows`.

9. **Create `VenueCard.tsx`** — `src/components/showtela/VenueCard.tsx`. Follows `DepartmentLoadCard.tsx` pattern. Displays: venue name, city, active rider indicator, department count, pressure level.

10. **Create `VenueSheet.tsx`** — `src/components/showtela/sheets/VenueSheet.tsx`. Follows `OperationSheet.tsx` / `PersonSheet.tsx` pattern. Displays full venue profile: specs, departments, active rider, rider history with promotion UI.

11. **Extend ShowTELA view model** — Add `venues: VenueViewModel[]` to `ShowTelaViewModel` in `src/components/showtela/types.ts`. Extend `buildViewModel.ts` to populate it.

12. **Wire into shell** — Add venue section to `ShowTelaShell.tsx`. Add navigation entry. Create `/showtela/venue/[venueId]/page.tsx`.

**Test gate:** Navigate to ShowTELA. Venues appear. Tap a venue — VenueSheet opens with specs and active rider. Rider promotion changes active state.

---

### Phase 2 — Rider Versioning + Venue Profiles Table (Future)

- Rider diff view (version comparison)
- `venue_profiles` table migration
- Supabase Storage bucket for binary PDF originals
- Venue entity deduplication / alias merging UI
- Venue-to-show linking (calendar `event.venue` resolves to venue entity)
- Continuity pressure indicators for missing specs or outdated riders

---

## IMPLEMENTATION CONSTRAINT SUMMARY

| Principle | Application |
|-----------|-------------|
| Prefer extension over replacement | `documentIngest.ts` extended, not replaced. `riderExtractor.ts` extended, not replaced. |
| Do not rebuild working systems | Parse pipeline, persistence layer, constitutional events — unchanged |
| Do not create duplicate ingestion paths | Rider ingestion flows through existing `POST /api/parse-document` → `documentIngest.ts` path |
| Do not create duplicate entity systems | Venue entities use existing `entityEngine.ts` / `entityStore.ts` / `durable_entities` infrastructure |
| Follow existing patterns | VenueSheet follows PersonSheet. VenueCard follows DepartmentLoadCard. Venue API routes follow showtela-operation/showtela-person patterns. |
| Continuity first | Active rider selection emits RuntimeEvent and logs constitutional event before any state change is considered final |

---

*End of Discovery Report.*  
*No code was modified during this analysis.*  
*Phase 0 complete. Ready for Phase 1A implementation upon approval.*
