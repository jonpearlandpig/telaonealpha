# TELAOne Component Rules

## Purpose
This repository uses a governed, continuity-first design system. Visual and interaction work must preserve operational calm and runtime clarity.

## Rules
- Compose views from reusable primitives in `src/primitives/*`.
- Use design tokens from `src/design/*` for color, spacing, radius, shadow, typography, glass, and motion.
- Avoid ad-hoc inline colors that bypass token governance.
- Keep interactions mobile-first (393px-first), thumb-reachable, and swipe-friendly.
- Preserve continuity readability and artifact lineage visibility in all UI updates.
- Prefer restrained cinematic motion; no bounce-heavy or flashy transitions.

## Do Not
- Create one-off visual patterns that drift from token system.
- Introduce dashboard clutter, dense tables, or hover-only interaction paths.
- Replace continuity, retrieval, artifact, or persistence runtime surfaces as part of design-only work.
