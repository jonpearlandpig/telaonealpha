# Continuity Event Shape v1

## Immutable Fields

- `id`
- `createdAt`
- `owner`
- `source`
- `body`
- `rawTranscript`
- `authorshipTrace`
- `lineageRef`

## Derived Fields

- `headline`
- `summary`
- `pressure`
- `classification`
- `nextActions`
- `tags`
- `confidence`

## Runtime Fields

- `replayVersion`
- `normalizationVersion`
- `normalizedBy`
- `sourceMode`

## Governance Notes

- Original source content is immutable and remains canonical.
- Derived intelligence may evolve as normalization improves.
- Replay uses immutable source content plus runtime version metadata.
