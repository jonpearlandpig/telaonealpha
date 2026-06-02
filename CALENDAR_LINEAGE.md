# Calendar Lineage

## Lineage Shape

Each canonical calendar event now carries:

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

## Mapping

- Originating artifact: durable artifact parsed by `parseMarkdownCalendar()`.
- Continuity event: best replay event for the artifact, preferring `CALENDAR_HYDRATED`.
- Import timestamp: continuity event `created_at` when available, otherwise artifact `createdAt`.
- Freshness timestamp: runtime hydration diagnostic timestamp.

## Future TELAwhy Preparation

This pass does not build full TELAwhy reasoning.

It exposes enough lineage for TELAwhy to later answer:

- Which artifact created this event?
- Which continuity event confirmed hydration?
- When was the event imported?
- When was the runtime view last hydrated?
