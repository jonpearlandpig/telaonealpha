# VENUE REFERENCE AUDIT
## Pre-Implementation — All Existing Venue References

**Date:** 2026-05-31  
**Purpose:** Exhaustive inventory of every existing venue reference before Phase 1 implementation.  
**Total occurrences:** 73 across 25 files.

---

## 1. TYPE DEFINITIONS & ONTOLOGY

### `src/lib/runtime/ontology/operationalOntology.ts`
- **Line 9:** `| 'venue'` — Member of `OperationalOntologyType` union
- **Line 68:** `venue: {` — Registry key in `OPERATIONAL_ONTOLOGY_REGISTRY`
- **Line 69:** `canonicalType: 'venue',` — Canonical type string in venue definition
- **Lines 68–76:** Full definition: `allowedReplaySources: ['entity']`, `reconciliationStrategy: 'canonical-id-and-lineage'`, `identityRequirements: ['canonical-object-id', 'entity-id']`

### `src/lib/runtime/ontology/objectNormalization.ts`
- **Line 162:** `if (entityId.startsWith('venue:')) return 'venue'` — Entity ID prefix → ontology type routing

### `src/types/feed.ts`
- **Line 1:** `'Venue Memory'` — Member of `ContinuityType` union

### `src/lib/showtela/calendar.ts`
- **Line 18:** `| 'venue'` — Member of calendar event type union
- **Line 263:** `venue_advance: 'venue'` — `venue_advance` kind maps to `'venue'` event type
- **Line 278:** `venue?: string` — Optional venue field on calendar event interface

### `src/lib/showtela/types.ts`
- **Line 105:** `'venue_packet'` — Member of `MediaMemoryType` union

### `src/lib/continuity/calendarExtractor.ts`
- **Line 3:** `venue?: string` — Optional venue field on extracted show date interface

### `src/lib/continuity/llm-normalize.ts`
- **Line 12:** `| 'venue'` — Valid value in `LLMNormalizationResult.classification` union

### `src/lib/runtime/operational/operationalExtraction.ts`
- **Line 10:** `| 'venue_advance'` — Member of `OperationalEventKind` union
- **Line 21:** `venue?: string` — Optional venue field on `OperationalEvent`
- **Line 45:** `venue?: string` — Optional venue field on `OperationalMovement`
- **Line 33:** `hasVenueAdvances: boolean` — Boolean flag on `OperationalReadiness`

---

## 2. ENTITY ID ROUTING

### `src/lib/runtime/ontology/objectNormalization.ts`
- **Line 162:** `if (entityId.startsWith('venue:')) return 'venue'` — **CRITICAL:** `venue:` prefix already routes to venue ontology type. All Phase 1 entity IDs must use this prefix.

---

## 3. CALENDAR & SCHEDULE REFERENCES

### `src/lib/continuity/calendarExtractor.ts`
- **Line 63:** Comment: `// Strip date from line to extract venue/city`
- **Line 71:** `const venue = parts[0] || undefined` — Extracted venue string from tour calendar
- **Line 89:** `results.push({ isoDate, venue, city, state, rawLine: line })` — venue added to extracted show date

### `src/lib/continuity/documentIngest.ts`
- **Line 71:** `venue: string | undefined` — Local variable in `showArtifact()` function
- **Line 89:** `linkedEntities: [venue, city].filter(Boolean) as string[]` — Venue string in artifact linked entities
- **Line 94:** `summary: [venue, city].filter(Boolean).join(', ') || 'TBD'` — Venue in continuity object summary
- **Line 96:** `provenance: { ... linkedEntity: venue }` — Venue string in provenance
- **Line 109:** `entities: [venue, city].filter(Boolean) as string[]` — Venue in ArtifactRecord entities
- **Line 173:** `const label = [show.venue, show.city, show.state].filter(Boolean).join(', ')` — Venue in calendar show label
- **Line 175:** `extraArtifacts.push(showArtifact(headline, show.isoDate, show.rawLine, show.venue, show.city, filename))`

### `src/lib/showtela/calendar.ts`
- **Line 169:** `if (text.includes('venue')) return 'venue'` — Text-based event type detection
- **Line 291:** `const location = [event.venue, event.city, event.state].filter(Boolean).join(', ')` — Location display string
- **Line 292-293:** `const summary = event.venue ? [event.venue, event.city].filter(Boolean).join(' — ') : ...`
- **Line 305:** `departments: event.venue ? [event.venue] : []` — Venue as department in calendar event

---

## 4. OPERATIONAL ACTIONS & LINEAGE

### `src/lib/runtime/actions.ts`
- **Line 8:** `INITIATE_VENUE_BRIEF: 'initiate.venue-brief'` — **CRITICAL:** Action constant for venue brief initiation. Already defined; Phase 1B active-rider promotion should use this action.

### `src/lib/runtime/objects/objectLineage.ts`
- **Line 45:** `'venue.brief.initiated'` — Mutation event type in `MUTATION_EVENT_TYPES` set
- **Line 46:** `'venue.brief.confirmed'` — Mutation event type in `MUTATION_EVENT_TYPES` set

### `src/lib/runtime/flightpath/legalityEngine.ts`
- **Line 24:** `[ACTIONS.INITIATE_VENUE_BRIEF]: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.GENERATE_REPORT]` — Legal movement successors
- **Line 72:** `[ACTIONS.INITIATE_VENUE_BRIEF]: { requiredAuthority: 'S1', allowedGovernanceStates: ['approved'], ... }` — Action policy (S1 authority required)

---

## 5. VENUE PATTERN DETECTION (ANCHOR DIRECTORY)

### `src/lib/showtela/anchorDirectory.ts`
- **Line 23:** Comment: `// Venue and physical-space indicators`
- **Line 24:** `const VENUE_PATTERN = /\b(venue|theater|theatre|arena|center|...)\b/i` — Regex for venue name detection in anchor directory context
- **Line 38:** Comment: `// Priority check order: venue → location → calendar → operation → project → tentative`
- **Line 44:** `if (VENUE_PATTERN.test(n)) { return { type: 'location', ... } }` — **NOTE:** Returns `'location'` type, NOT `'venue'`. This is intentional for relay-derived names. Dedicated rider-extracted entities use `'venue'` type.

### `src/lib/runtime/state/heuristics.ts`
- **Line 30:** `if (label.includes('venue') || ...)` — Heuristic routing label detection

### `src/lib/runtime/objects/objectRelationships.ts`
- **Line 11:** Comment: `// object is anchored to a named entity (person, venue, etc.)`

---

## 6. OPERATIONAL EXTRACTION

### `src/lib/runtime/operational/operationalExtraction.ts`
- **Line 78:** `if (text.includes('venue advance') || /advance.*show/i.test(text)) return 'venue_advance'`
- **Line 119:** `venue: linkedEntity` — Venue assigned from linked entity name
- **Line 141:** `const venueAdvances = futureEvents.filter(e => e.kind === 'venue_advance')`
- **Line 145:** `const hasVenueAdvances = venueAdvances.length > 0`
- **Line 150:** `if (hasVenueAdvances) score += 20` — Venue advance adds 20 pts to operational readiness score
- **Line 167:** `hasVenueAdvances` — Included in `OperationalReadiness` object
- **Line 191:** `venue: e.venue` — Venue field mapped in operational movement

---

## 7. UI COMPONENT REFERENCES

### `src/components/showtela/CrusadeOperationsRail.tsx`
- **Line 4:** `venues: 'https://images.unsplash.com/...'` — Asset image mapping for venues section

### `src/components/showtela/calendarTrust.ts`
- **Line 23:** `if (event.type === 'venue') return 'venue'` — Type-based trust label

### `src/components/showtela/OpeningSurface.tsx`
- **Line 108:** `{ label: 'Tour Calendar', detail: 'Dates, venues, and schedule' }` — UI descriptive string

### `src/components/showtela/OperationalCalendar.tsx`
- **Line 36:** `if (event?.source === 'notion') return 'Synced from venue packet'` — Tooltip string
- **Line 37:** `if (event?.unresolvedCount) return 'Awaiting venue confirmation'` — Tooltip string

---

## 8. FOCUS ENGINE

### `src/lib/focus/focusBuilder.ts`
- **Line 77:** `if (name.includes('rider')) return 'Follow up with venue regarding rider acceptance'`
- **Line 81:** `if ((name.includes('venue') || name.includes('advance')) && name.includes('advance')) return 'Complete venue advance'`

---

## 9. CONTENT CLASSIFICATION & AI

### `src/lib/continuity/documentClassifier.ts`
- **Line 8:** `/\bvenue\b/i` — Pattern in `CALENDAR_CONTENT` array for detecting venue mentions in calendar documents

### `src/lib/continuity/llm-normalize.ts`
- **Line 36:** Comment: `- entities: array of people/venues/orgs/projects explicitly named`
- **Line 40:** `venue|staffing|...` — Valid classification value in NORMALIZATION_PROMPT

### `src/lib/runtime/replay/derivedArtifacts.ts`
- **Line 22:** `/project|show|tour|crusade|venue/i` — Regex filter for linked entity classification

---

## 10. MOCK DATA

### `src/lib/showtela/mockData.ts`
- **Line 20:** `{ id: 'venues', title: 'Venues', unresolvedCount: 1, ... }` — Mock operation
- **Line 25:** `operation: 'Venues'` — Mock unresolved item linked to Venues operation
- **Line 30:** `tags: ['VENUE', 'PRODUCTION']` — Tag in mock feed event
- **Line 35:** `summary: 'Venue trim request added'` — Mock timeline item summary

### `src/lib/notion/client.ts`
- **Line 5:** `'venue ops'` — Mentioned in mock continuity headline
- **Line 6:** `type: 'Venue Memory', department: 'Venue Ops'` — Mock continuity card
- **Line 16:** `{ id: 'venue', name: 'Venue Ops', ... }` — Mock operations entry

---

## 11. BUILD VIEW MODEL

### `src/lib/showtela/buildViewModel.ts`
- **Line 25:** Comment: `// to prevent venue names, department labels, and regex artifacts from entering ActiveOps.`
- **Line 101:** `state.entities.filter(e => e.id.startsWith('rider-dept:'))` — **CRITICAL PATTERN:** Department entities filtered by id prefix. Phase 1 venue entities filtered by `e.type === 'venue'` following same pattern.

---

## CRITICAL PATHS FOR PHASE 1 IMPLEMENTATION

| Path | Status | Phase 1 Action |
|------|--------|----------------|
| `venue:` entity ID prefix → ontology type 'venue' | **Already working** | Follow existing pattern — no change |
| `INITIATE_VENUE_BRIEF` action | **Already defined** | Use for active-rider RuntimeEvent emission |
| `venue.brief.initiated` lineage event | **Already in MUTATION_EVENT_TYPES** | Emit this event type from set-active-rider |
| `state.entities.filter(e => e.id.startsWith('rider-dept:'))` | **Already working** | Follow same pattern for `e.type === 'venue'` |
| `anchorDirectory.VENUE_PATTERN` returns `'location'` | **By design** | Do NOT change. Relay-derived → location. Rider-extracted → venue. |
| `EntityType` union missing 'venue' | **GAP** | Add in Phase 1A |
| `VALID_ENTITY_TYPES` missing 'venue' | **GAP** | Add in Phase 1A |
| No rider artifact created in production-rider ingest | **GAP** | Add in Phase 1A |
| No venue_id / is_active_rider columns | **GAP** | Add in Phase 1B migration |
| No VenueSheet component | **GAP** | Add in Phase 1C |

---

*Audit complete. Implementation may begin.*
