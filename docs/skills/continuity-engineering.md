# Continuity Engineering Skill

## Purpose

Teach Codex that continuity preservation is more important than feature generation.

## Preserve

- operational lineage
- timestamps
- unresolved state
- actor attribution
- previous decision context
- source references
- state transitions

## Never

- overwrite continuity logs
- destroy historical records
- collapse append-only systems into mutable state
- remove provenance metadata
- silently discard unresolved context

## Prefer

- append-only patterns
- event-native structures
- lineage-safe updates
- resumable operational context
- explicit state transitions

## Operating Rule

If a change weakens provenance, historical replay, or unresolved-state visibility, revise it before merge.
