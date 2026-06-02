# Operation Lineage

## Authority

Operations are created from hydrated artifact evidence, not from dashboard placeholders.

Canonical operation lineage fields:

| Field | Source |
|---|---|
| Originating artifact | Artifact that produced the operation department, requirement, or continuity thread |
| Originating continuity event | Hydration event that made the operation visible |
| Creation timestamp | Hydration event `created_at`; fallback artifact `createdAt` |

## Operation Sources

| Operation source | Parser | Originating artifact | Originating continuity event | Creation timestamp |
|---|---|---|---|---|
| Directory department | `parseMarkdownDirectory()` | Anchor Directory artifact | `PEOPLE_HYDRATED`, fallback `ANCHOR_UPLOADED` | Event `created_at` |
| Calendar department | `parseMarkdownCalendar()` | Tour Calendar artifact | `CALENDAR_HYDRATED`, fallback `CALENDAR_UPLOADED` | Event `created_at` |
| Rider department | `parseMarkdownRider()` | Production Rider artifact | `OPERATIONS_HYDRATED`, fallback `RIDER_UPLOADED` | Event `created_at` |
| Rider requirement | `parseMarkdownRider()` | Production Rider artifact | `OPERATIONS_HYDRATED`, fallback `RIDER_UPLOADED` | Event `created_at` |
| Replay continuity thread | Runtime replay object | Runtime event payload artifact when present | Runtime event mapped by `buildShowTelaContinuityEvents()` | Runtime event `createdAt` |

## Current Proof Operations

| Operation group | Originating artifact | Originating continuity event | Creation timestamp | Created because |
|---|---|---|---|---|
| Executive and Tour Leadership | Anchor Directory | `PEOPLE_HYDRATED` | Runtime-filled | Directory section named a leadership department and named accountable people |
| Creative Direction | Anchor Directory | `PEOPLE_HYDRATED` | Runtime-filled | Directory section named creative roles and people |
| ShowTELA Operations | Anchor Directory | `PEOPLE_HYDRATED` | Runtime-filled | Directory section named runtime owners and operating roles |
| Music Rehearsals | Tour Calendar | `CALENDAR_HYDRATED` | Runtime-filled | Calendar section produced dated rehearsal events |
| Production Rehearsals | Tour Calendar | `CALENDAR_HYDRATED` | Runtime-filled | Calendar section produced dated production events |
| Spring 2027 Tour Routing | Tour Calendar | `CALENDAR_HYDRATED` | Runtime-filled | Calendar routing table produced dated venue events |
| ShowTELA Operational Events | Tour Calendar | `CALENDAR_HYDRATED` | Runtime-filled | Calendar section produced runtime readiness events |
| Audio | Production Rider | `OPERATIONS_HYDRATED` | Runtime-filled | Rider department produced requirements |
| Lighting | Production Rider | `OPERATIONS_HYDRATED` | Runtime-filled | Rider department produced requirements |
| Video | Production Rider | `OPERATIONS_HYDRATED` | Runtime-filled | Rider department produced requirements |
| Stage Management | Production Rider | `OPERATIONS_HYDRATED` | Runtime-filled | Rider department produced requirements |
| Transportation | Production Rider | `OPERATIONS_HYDRATED` | Runtime-filled | Rider department produced requirements |
| Security | Production Rider | `OPERATIONS_HYDRATED` | Runtime-filled | Rider department produced requirements |

## Display Contract

Every operation surface must expose:

| Display label | Runtime path |
|---|---|
| From | `lineage.originatingArtifact.title` |
| Entered continuity | `lineage.createdAt` |
| Continuity event | `lineage.continuityEvent.type` and `lineage.continuityEvent.id` |
| Created by | `lineage.author.name` |
| Why it exists | First `lineage.effects[]` entry that names the parser result, such as `rider.department.created` |
