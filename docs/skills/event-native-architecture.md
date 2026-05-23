# Event-Native Architecture Skill

## Purpose

Protect the architecture from drifting back into document-centric systems.

## Core Rule

Events are the source of truth. Artifacts are derived.

## Prefer

- event streams
- append-only lineage
- causal relationships
- operational state transitions
- replayable histories
- auditable state movement

## Avoid

- document-centric assumptions
- mutable history
- disconnected artifact systems
- final-output-only logging
- untraceable state changes

## Operating Rule

When choosing between event lineage and document convenience, preserve the event model.
