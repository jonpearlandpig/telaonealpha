---
name: continuity-engineering
description: Use when a task touches events, feed rendering, ingestion, operational history, unresolved state, provenance, or any feature that could weaken continuity preservation.
---

# Continuity Engineering

## Purpose

Preserve operational continuity, lineage, provenance, and unresolved state ahead of feature expansion.

## Core Runtime Laws

- Continuity is more important than convenience.
- Events and state transitions must remain traceable.
- Unresolved context must survive edits, failures, and handoffs.

## MUST

- Preserve timestamps, actor attribution, source references, and prior context.
- Protect append-only or lineage-safe patterns where they exist.
- Keep unresolved state visible until it is explicitly reconciled.
- Preserve continuity object structure when adding ingestion paths.

## MUST NOT

- Overwrite continuity logs silently.
- Remove provenance metadata.
- Collapse append-only behavior into mutable history.
- Discard conflicting or stale context without surfacing it.
- Fabricate certainty where continuity is partial.

## Preferred Behaviors

- Use explicit state transitions.
- Preserve competing context when ambiguity exists.
- Favor resumable context over cleaned-up but lossy state.
- Treat ingestion as normalization into continuity objects, not raw file handling.

## PR Review Implications

- Does this preserve unresolved state?
- Does it preserve lineage or prepare for it?
- Are provenance fields still present and accurate?
- Does it avoid silent destruction of history?

## Operational Examples

- Good: append a new continuity object with `who`, `what`, `when`, linked entity, and linked operation.
- Good: surface stale or conflicting operational context instead of hiding it.
- Bad: replace feed history with only the latest snapshot.
- Bad: remove actor attribution because the UI “looks cleaner” without it.
