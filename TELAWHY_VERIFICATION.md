# TELAwhy Verification

## Scope

Verification anchors:

- Anchor Directory: `proof/crusade-june1-anchor.md`
- Tour Calendar: `proof/crusade-june1-calendar.md`
- Production Rider: `proof/crusade-june1-rider.md`

Parser verification was run against the current code on June 1, 2026:

| Artifact | Parser result |
|---|---|
| Anchor Directory | 18 people, 6 directory departments |
| Tour Calendar | 32 calendar events, 5 calendar departments |
| Production Rider | 6 rider departments, 18 rider requirements |

## Trace 1: Anchor Directory

`Artifact -> Continuity Event -> TELAwhy`

| TELAwhy field | Verified value |
|---|---|
| Source Artifact | Anchor Directory |
| Import Timestamp | From `ANCHOR_UPLOADED` or `PEOPLE_HYDRATED` continuity event timestamp |
| Author | From continuity event `created_by`; unavailable values render as missing |
| Linked Entities | 18 parsed people |
| Linked Operations | 6 parsed directory departments |
| Linked Calendar Events | Calendar owners can reconcile to people introduced by this artifact |
| Continuity Event | `ANCHOR_UPLOADED`, then `PEOPLE_HYDRATED` |

TELAwhy answer:

- Why: the anchor directory introduced accountable people and departments into continuity.
- Evidence: source artifact, parser counts, continuity event id, runtime source.
- Impact: people and department anchors become visible to ShowTELA runtime surfaces.

## Trace 2: Tour Calendar

`Artifact -> Continuity Event -> TELAwhy`

| TELAwhy field | Verified value |
|---|---|
| Source Artifact | Tour Calendar |
| Import Timestamp | From `CALENDAR_UPLOADED` or `CALENDAR_HYDRATED` continuity event timestamp |
| Author | From continuity event `created_by`; unavailable values render as missing |
| Linked Entities | Calendar owners named in parsed events |
| Linked Operations | 5 calendar departments |
| Linked Calendar Events | 32 canonical calendar events |
| Continuity Event | `CALENDAR_UPLOADED`, then `CALENDAR_HYDRATED` |

TELAwhy answer:

- Why: the tour calendar supplied dated operational events for runtime scheduling.
- Evidence: source artifact, 32 parsed events, 5 departments, continuity event id.
- Impact: Home rail, Calendar screen, Messages presence, and health counts can explain their calendar basis.

## Trace 3: Production Rider

`Artifact -> Continuity Event -> TELAwhy`

| TELAwhy field | Verified value |
|---|---|
| Source Artifact | Production Rider |
| Import Timestamp | From `RIDER_UPLOADED` or `OPERATIONS_HYDRATED` continuity event timestamp |
| Author | From continuity event `created_by`; unavailable values render as missing |
| Linked Entities | Role-based owners until reconciled to people |
| Linked Operations | Audio, Lighting, Video, Stage Management, Transportation, Security |
| Linked Calendar Events | Rider pressure can attach to production rehearsal and venue routing days |
| Continuity Event | `RIDER_UPLOADED`, then `OPERATIONS_HYDRATED` |

TELAwhy answer:

- Why: the production rider supplied operational departments and requirements.
- Evidence: source artifact, 6 departments, 18 requirements, continuity event id.
- Impact: a dispatch such as `Production Rider - 6 Departments Activated` can show why, who, when, source, evidence, and operational impact without leaving the runtime.

## Verification Result

TELAwhy now has a shared runtime shape and UI card for:

- Continuity Timeline: each timeline item exposes `View TELAwhy`.
- Play Feed / Dispatches: each dispatch exposes `View TELAwhy`.
- Feed Details: the dispatch sheet includes the full TELAwhy card.
- Messages: each generated TELA answer displays `Why This Answer Exists`, `Evidence Used`, and `Last Updated`.

Fallback behavior:

- Missing source artifact metadata renders as `LOW PROVENANCE`.
- Missing source artifact and continuity event renders as `INSUFFICIENT CONTINUITY`.
- TELAwhy never invents author, timestamp, artifact, or lineage certainty.
