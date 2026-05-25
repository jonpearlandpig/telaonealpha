---
name: runtime-restraint
description: Use when working on TELAOne or ShowTELA runtime changes that risk overbuilding, speculative infrastructure, stable-system rewrites, or unnecessary dependency growth.
---

# Runtime Restraint

## Purpose

Protect stable substrate systems from unnecessary rewrites, abstractions, and speculative infrastructure.

## Core Runtime Laws

- Stable substrate is protected infrastructure.
- Small reversible patches are preferred over broad rewrites.
- Working runtime behavior outranks architectural elegance.

## MUST

- Preserve auth, persistence, hydration, routing, continuity lineage, mobile responsiveness, and operational feed rendering.
- Prefer narrow surface edits before changing underlying architecture.
- Choose the smallest change that solves the real problem.
- Keep new dependencies rare and justified.

## MUST NOT

- Rewrite stable systems without explicit need.
- Introduce speculative orchestration or meta-frameworks.
- Add abstractions before repeated need is proven.
- Expand scope just because adjacent cleanup is tempting.
- Add dependencies for novelty, styling, or agent convenience.

## Preferred Behaviors

- Patch in place.
- Reuse existing primitives.
- Preserve current route behavior.
- Defer architecture expansion until substrate pressure is proven.
- Call out when a requested change risks destabilizing protected systems.

## PR Review Implications

- Does this change avoid unnecessary rewrites?
- Does it preserve protected infrastructure?
- Is the scope the minimum viable intervention?
- Did it avoid new dependencies or justify them clearly?

## Operational Examples

- Good: adjust an existing ShowTELA component to reduce UI noise without changing routing or data flow.
- Good: add a small helper inside an existing file instead of introducing a new abstraction layer.
- Bad: replace hydration logic to support a cosmetic surface change.
- Bad: create a new orchestration system before current runtime constraints require it.
