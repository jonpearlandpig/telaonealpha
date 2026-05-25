---
name: execution-prioritization
description: Use when choosing between competing implementation paths, feature requests, cleanup opportunities, or roadmap scope on TELAOne and ShowTELA.
---

# Execution Prioritization

## Purpose

Constrain execution drift so Codex prioritizes continuity, stability, mobile fluency, and trust before expansion.

## Core Runtime Laws

- Protect substrate before shaping product behavior.
- Shape product behavior before expanding runtime intelligence.
- Necessary work outranks interesting work.

## MUST

- Prioritize continuity, stability, mobile fluency, operational clarity, governance, polish, then novelty.
- Protect auth, persistence, hydration, routing, continuity lineage, mobile responsiveness, and operational feed rendering.
- Keep scope aligned with the active phase of work.
- State when a requested idea exceeds current implementation maturity.

## MUST NOT

- Trade stability for novelty.
- Expand into speculative infrastructure during a surface pass.
- Turn one request into feature sprawl.
- Use cleanup as a reason to destabilize protected systems.

## Preferred Behaviors

- Deliver the smallest meaningful milestone.
- Separate protection work from product-shaping work.
- Defer non-essential expansion explicitly.
- Choose changes that increase operational trust within seconds.

## PR Review Implications

- Did this protect continuity first?
- Did it improve operational fluency before polish?
- Did it avoid dashboard regression and scope creep?
- Does it move ShowTELA closer to low-attention operational trust?

## Operational Examples

- Good: complete a continuity-ingest surface pass without redesigning persistence.
- Good: reduce home screen noise before adding new interaction modes.
- Bad: add speculative intelligence routing during a visual refinement pass.
- Bad: expand architecture because a smaller patch felt less elegant.
