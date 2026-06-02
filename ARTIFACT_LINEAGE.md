# Artifact Lineage

## Authority

Artifact lineage starts at `ArtifactRecord` and is confirmed by replay continuity events.

Canonical artifact fields:

| Field | Source |
|---|---|
| Source | `ArtifactRecord.fileName`, `ArtifactRecord.title`, `ArtifactRecord.classification`, parser-detected artifact kind |
| Import timestamp | Preferred continuity event `created_at`; fallback `ArtifactRecord.createdAt` |
| Author | Preferred continuity event `created_by`; fallback runtime event `payload.submittedBy`, `payload.owner`, or `source` |
| Continuity event | Best event for the artifact, preferring hydration events over upload events |

## Continuity Event Ranking

| Artifact kind | Upload event | Hydration event | Hydration result |
|---|---|---|---|
| Anchor Directory | `ANCHOR_UPLOADED` | `PEOPLE_HYDRATED` | People/entities |
| Tour Calendar | `CALENDAR_UPLOADED` | `CALENDAR_HYDRATED` | Calendar events |
| Production Rider | `RIDER_UPLOADED` | `OPERATIONS_HYDRATED` | Operations and operational requirements |
| Daysheet | `DAYSHEET_UPLOADED` | Domain-specific hydration event when available | Daily operational state |
| Generic artifact | `ARTIFACT_CREATED` or `ARTIFACT_UPDATED` | None required | Continuity evidence |

Hydration events are more authoritative than upload events because they prove the artifact changed runtime memory, not only storage.

## Current Proof Artifacts

| Artifact | Source | Import timestamp | Author | Continuity event | Runtime change |
|---|---|---|---|---|---|
| Anchor Directory | `proof/crusade-june1-anchor.md` | Runtime-filled from `PEOPLE_HYDRATED.created_at`; fallback artifact `createdAt` | Runtime-filled from `created_by`, expected `Jon Hartman` when submitted by sovereign operator | `PEOPLE_HYDRATED`, fallback `ANCHOR_UPLOADED` | 18 people and 6 directory departments become entity and operations context |
| Tour Calendar | `proof/crusade-june1-calendar.md` | Runtime-filled from `CALENDAR_HYDRATED.created_at`; fallback artifact `createdAt` | Runtime-filled from `created_by`, expected `Jon Hartman` when submitted by sovereign operator | `CALENDAR_HYDRATED`, fallback `CALENDAR_UPLOADED` | 32 canonical calendar events become calendar authority |
| Production Rider | `proof/crusade-june1-rider.md` | Runtime-filled from `OPERATIONS_HYDRATED.created_at`; fallback artifact `createdAt` | Runtime-filled from `created_by`, expected `Jon Hartman` when submitted by sovereign operator | `OPERATIONS_HYDRATED`, fallback `RIDER_UPLOADED` | 6 rider departments and 18 requirements become operations pressure context |

## Display Contract

Every artifact surface must expose:

| Display label | Runtime path |
|---|---|
| Source | `artifact.fileName ?? artifact.title` plus detected kind |
| Imported | `lineage.importedAt` |
| Added by | `lineage.author.name` or `continuityEvent.created_by` |
| Continuity event | `lineage.continuityEvent.id` and `lineage.continuityEvent.type` |
| Changed | `lineage.effects[]` summarized as people, operations, calendar events, unresolved state, or artifact-only evidence |

If a value is missing, the UI must say `Pending lineage` or `Unknown author`; it must not fabricate provenance.
