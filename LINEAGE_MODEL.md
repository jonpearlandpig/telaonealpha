# Unified Lineage Model

## Objective

Every clickable runtime object must answer:

- Where did this come from?
- Why does it exist?
- What created it?
- When did it enter continuity?
- Who introduced it?

## Shared Object

Use one lineage object across calendar, people, operations, and artifacts.

```ts
type ShowTelaLineageObject = {
  id: string
  objectType: 'artifact' | 'calendar_event' | 'person' | 'entity' | 'operation' | 'continuity_event'
  objectId: string
  source: {
    mode: 'artifact' | 'runtime_event' | 'notion' | 'manual' | 'system'
    artifactId?: string
    artifactTitle?: string
    artifactFileName?: string
    parser?: 'directory' | 'calendar' | 'rider' | 'daysheet' | 'generic'
  }
  author: {
    id?: string
    name: string
    surface?: string
  }
  importedAt: string
  createdAt: string
  updatedAt?: string
  continuityEvent: {
    id: string
    type: string
    createdAt: string
  }
  parent?: {
    objectType: ShowTelaLineageObject['objectType']
    objectId: string
  }
  path: Array<{
    objectType: ShowTelaLineageObject['objectType']
    objectId: string
    label: string
  }>
  effects: Array<{
    type:
      | 'artifact.stored'
      | 'people.hydrated'
      | 'entity.created'
      | 'operation.created'
      | 'calendar_event.created'
      | 'requirement.created'
      | 'unresolved.changed'
    objectId?: string
    label: string
    count?: number
  }>
}
```

## Field Rules

| Field | Rule |
|---|---|
| `id` | Deterministic: `lineage:{objectType}:{objectId}` |
| `objectType` | Object being inspected |
| `source.artifactId` | Required when the object came from an artifact |
| `source.parser` | Parser that created the object: directory, calendar, rider, daysheet, or generic |
| `author.name` | Preferred `continuityEvent.created_by`; fallback runtime source; never fabricated |
| `importedAt` | Preferred hydration event `created_at`; fallback upload event `created_at`; fallback artifact `createdAt` |
| `continuityEvent` | Most authoritative event for this object, preferring hydration over upload |
| `parent` | Immediate parent object, such as calendar event parent artifact |
| `path` | Ordered evidence chain from source artifact to current object |
| `effects` | Concrete runtime changes caused by this lineage |

## Shared Usage

| Runtime surface | Lineage attachment |
|---|---|
| Calendar | `OperationalCalendarEvent.lineage` |
| People/entities | `PersonItem.lineage` or durable entity lineage metadata |
| Operations | `OperationEntity.lineage` or operational object lineage metadata |
| Artifacts | `ArtifactRecord.lineageId` plus expanded `ShowTelaLineageObject` |
| Continuity events | `ContinuityEvent.lineageRef` plus expanded `ShowTelaLineageObject` |

## Current Implementation Bridge

Calendar Authority already carries a partial lineage shape:

- `sourceArtifactId`
- `sourceArtifactTitle`
- `importedAt`
- `freshnessTimestamp`
- `continuityEventId`
- `lineage.originatingArtifactId`
- `lineage.originatingArtifactTitle`
- `lineage.continuityEventId`
- `lineage.importTimestamp`
- `lineage.freshnessTimestamp`

The unified object keeps those fields but normalizes names for people, operations, artifacts, and calendar events.

## Non-Negotiables

- No object may claim lineage without an artifact, runtime event, or explicit manual source.
- Hydration lineage outranks upload lineage.
- Derived dashboard objects cannot become source authority.
- Missing author or timestamp must display as missing, not inferred.
- TELAwhy must read this object as evidence, not generate narrative provenance.
