# Entity Lineage

## Authority

Entity lineage is evidence-first. People and named entities must point back to the artifact and continuity event that introduced them.

Canonical entity lineage fields:

| Field | Source |
|---|---|
| Source artifact | Artifact parsed by `parseMarkdownDirectory()` or linked from runtime event payload |
| Import timestamp | Hydration event `created_at`; fallback artifact `createdAt` |
| Continuity path | Artifact upload event, hydration event, and any downstream operation or calendar references |

## Current Proof People

The Anchor Directory currently parses 18 people. Each person should carry the same artifact-level lineage path:

`proof/crusade-june1-anchor.md` -> `ANCHOR_UPLOADED` -> `PEOPLE_HYDRATED` -> `person:{slugified-name}`.

| Person/entity group | Source artifact | Import timestamp | Continuity path |
|---|---|---|---|
| Executive and Tour Leadership people | Anchor Directory | Runtime-filled from `PEOPLE_HYDRATED.created_at` | Anchor Directory -> `ANCHOR_UPLOADED` -> `PEOPLE_HYDRATED` -> active person entity |
| Creative Direction people | Anchor Directory | Runtime-filled from `PEOPLE_HYDRATED.created_at` | Anchor Directory -> `ANCHOR_UPLOADED` -> `PEOPLE_HYDRATED` -> active person entity |
| ShowTELA Operations people | Anchor Directory | Runtime-filled from `PEOPLE_HYDRATED.created_at` | Anchor Directory -> `ANCHOR_UPLOADED` -> `PEOPLE_HYDRATED` -> active person entity |

## Calendar Owners

Calendar owners are not standalone people unless they also resolve to a person entity. When a calendar row names an owner, the owner lineage path is:

`Tour Calendar artifact` -> `CALENDAR_HYDRATED` -> `calendar event` -> `owner name`.

Examples from the Tour Calendar:

| Owner | Source artifact | Import timestamp | Continuity path |
|---|---|---|---|
| Sam Rivers | Tour Calendar | Runtime-filled from `CALENDAR_HYDRATED.created_at` | Tour Calendar -> `CALENDAR_HYDRATED` -> ShowTELA Staff Onboarding -> owner |
| Miles Okada | Tour Calendar | Runtime-filled from `CALENDAR_HYDRATED.created_at` | Tour Calendar -> `CALENDAR_HYDRATED` -> Venue Data Ingestion Test -> owner |
| Marcus Stone | Tour Calendar | Runtime-filled from `CALENDAR_HYDRATED.created_at` | Tour Calendar -> `CALENDAR_HYDRATED` -> Tour Continuity Stress Test -> owner |
| Kay Jing | Tour Calendar | Runtime-filled from `CALENDAR_HYDRATED.created_at` | Tour Calendar -> `CALENDAR_HYDRATED` -> Dispatch Routing Verification -> owner |
| Jon Hartman | Tour Calendar | Runtime-filled from `CALENDAR_HYDRATED.created_at` | Tour Calendar -> `CALENDAR_HYDRATED` -> Final Runtime Readiness Review -> owner |

## Display Contract

Every people/entity surface must expose:

| Display label | Runtime path |
|---|---|
| Source artifact | `lineage.originatingArtifact.title` |
| Imported | `lineage.importedAt` |
| Continuity path | `lineage.path[]` rendered as artifact, event, entity, and downstream object |
| Introduced by | `lineage.author.name` |
| Current impact | `lineage.effects[]` filtered to operations, calendar events, and unresolved state |

If a person appears in multiple sources, the UI must show the earliest introduction plus additional confirming lineage events.
