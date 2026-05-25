# Operator Handoff Protocol

**Classification:** Constitutional operational document.
**Authority:** `AGENTS.md`, `docs/CONSTITUTIONAL_RUNTIME_RULES.md`, and domain runtime documents.
**Purpose:** Define operator interoperability rules for TELAOne and ShowTELA runtime development.

This protocol governs how operators review, modify, and hand off runtime work. Repo governance overrides conversational assumptions. Constitutional docs are the source of implementation authority.

> **Trust comes before intelligence spectacle.**

Stabilization precedes expansion. Operators must preserve continuity integrity before adding capability.

---

## I. Repo-Native Constitutional Authority

The repository is the authority boundary. Decisions are valid only when they conform to checked-in governance and runtime documents.

Authority order:

1. Explicit sovereign ruling in the current work session.
2. `AGENTS.md`.
3. `docs/CONSTITUTIONAL_RUNTIME_RULES.md`.
4. Domain-specific docs in `docs/runtime/`, `docs/constitutional/`, and `runtime/`.
5. Existing implementation patterns.
6. Operator judgment.

Conversational assumptions, model defaults, and external conventions do not override repo governance.

---

## II. Operator Role Expectations

Operators are implementers, reviewers, and continuity stewards. They do not invent authority.

Required posture:

- Read the relevant constitutional and runtime docs before architecture-affecting work.
- Preserve existing continuity, provenance, and diagnostic fields.
- Prefer small, reviewable changes over broad rewrites.
- Treat unresolved runtime state as operational data, not display decoration.
- Escalate conflicts between code and governance instead of resolving them silently.

---

## III. Branch Discipline Rules

Runtime work must remain traceable and reviewable.

- One branch should represent one coherent runtime change.
- Do not mix stabilization, feature expansion, visual redesign, and cleanup unless explicitly authorized.
- Avoid opportunistic refactors outside the affected layer.
- Keep commits and PR descriptions tied to the runtime rule or operational gap being addressed.
- Do not merge when constitutional authority, provenance behavior, or continuity impact is unclear.

---

## IV. Runtime Review Requirements

Every runtime change must be reviewed against:

- Layer ownership.
- Canonical source preservation.
- Cache behavior.
- Derived surface behavior.
- Provenance and lineage retention.
- Diagnostic visibility.
- Runtime budget impact.
- Failure behavior.

Reviewers must identify whether a change modifies runtime truth, cache representation, derived surfaces, or only presentation.

---

## V. Merge Review Protocol

Before merge, the operator must confirm:

- The change obeys constitutional precedence.
- No derived surface becomes a source of truth.
- Cache writes remain derived, explainable, and server-side.
- Inference output is not promoted silently.
- Continuity fields are preserved or intentionally transformed with lineage.
- Empty, stale, failed, and partial states remain diagnosable.
- Any deferred work is named explicitly.

Merge approval requires runtime observation, not only static inspection.

---

## VI. Stabilization-First Engineering Posture

Stabilization precedes expansion.

Preferred work:

- Fixing hydration reliability.
- Preserving lineage and source IDs.
- Improving diagnostic state.
- Tightening type boundaries.
- Reducing drift between canonical data and rendered surfaces.
- Making fallback behavior explicit.

Non-preferred work:

- New orchestration layers.
- Speculative inference systems.
- Presentation changes that obscure provenance.
- Feature expansion before current runtime paths are stable.
- Complexity that exists to demonstrate intelligence rather than improve operator trust.

---

## VII. Runtime Observation Before Merge

Runtime behavior must be observed before merge when a change affects hydration, cache writes, continuity reconstruction, derived surfaces, or operational diagnostics.

Minimum observation:

- Run the relevant type, lint, build, or test command available in the repo.
- Exercise the affected route, component, or runtime path when feasible.
- Inspect logs or diagnostics for empty, stale, partial, and failed states.
- Confirm no runtime path drops provenance, lineage, or hydration metadata.

If observation is not possible, the merge note must state what was not observed and why.

---

## VIII. Runtime Truth, Cache Layer, and Derived Surfaces

Runtime truth is the canonical operational record. In this repo, canonical authority is defined by the constitutional runtime documents and current source-of-truth configuration.

Cache layer is a derived operational copy. It may improve hydration and resilience, but it does not become canonical by storing data. Supabase cache rows must remain explainable by source, authority, decision, and lineage.

Derived surfaces are rendered views and ViewModels. They reflect operational truth; they do not define it. A wrong surface is a retrieval, mapping, or derivation failure.

Rules:

- Runtime truth governs cache and surfaces.
- Cache may not silently upgrade volatile or inference-only data.
- Surfaces may not invent canonical state.
- Field loss between truth, cache, and surface must be intentional, documented, or fixed.

---

## IX. Current Active Engineering Priorities

Active priorities are stabilization-focused:

- ShowTELA hydration reliability.
- Supabase cache correctness and explainability.
- Notion-to-cache provenance preservation.
- Continuity feed reconstruction without lineage loss.
- Diagnostic visibility for empty, stale, partial, and failed states.
- Type-safe ViewModel propagation.
- Runtime budget compliance.
- Drift prevention between constitutional docs and implementation.

---

## X. Known Intentionally Deferred Systems

Deferred systems must not be reintroduced under new names without explicit authority.

- Autonomous agent abstractions.
- Recursive runtime orchestration.
- Speculative graph construction from inference output.
- Inference-driven mutation of canonical state.
- Batch normalization beyond documented runtime budgets.
- New intelligence layers before stabilization work is complete.
- Marketing-style or spectacle-first operational surfaces.

Deferred does not mean forgotten. It means not authorized for current implementation.

---

## XI. Operator Behavioral Constraints

Operators must:

- Follow repo governance before model preference.
- Keep implementation bounded to the requested operational gap.
- Avoid speculative autonomy language in code, docs, and PR notes.
- Preserve continuity integrity across handoffs.
- Label uncertainty instead of converting it into apparent fact.
- Avoid silent fallbacks for operational data.
- Keep runtime decisions explainable to a human operator.

Operators must not:

- Treat inference output as canonical truth.
- Hide degraded state behind polished UI.
- Replace constitutional rules with conversational reasoning.
- Introduce agent fiction, AI hype, or speculative autonomy claims.
- Expand scope because a model can generate more behavior.

---

## XII. Explainability Expectations

Operational changes must be explainable in four terms:

| Term | Requirement |
|------|-------------|
| Source | Identify where the data or trigger came from. |
| Authority | Identify why the source is trusted or limited. |
| Decision | Identify the rule, mapping, or threshold used. |
| Lineage | Identify what prior state is continued, superseded, or resolved. |

If these fields cannot be explained, the output is volatile and must not be promoted as canonical.

---

## XIII. Drift Prevention Rules

Drift is any divergence between constitutional intent, runtime implementation, cache behavior, and rendered surfaces.

Prevention rules:

- Update docs when implementation authority changes.
- Update implementation when constitutional docs expose a violation.
- Keep terminology stable across code, docs, and PR notes.
- Do not introduce aliases for canonical concepts unless the mapping is explicit.
- Prefer typed propagation over ad hoc field copying.
- Preserve diagnostic fields through ViewModel construction.
- Review derived surfaces for accidental truth ownership.

Drift detection is a runtime responsibility, not a cleanup preference.

---

## XIV. Operator Strengths and Handoff Use

Claude Code is preferred for:

- Audits.
- Deep reasoning.
- Constitutional review.
- Drift detection.

Codex is preferred for:

- Deterministic implementation.
- Constrained propagation.
- Type-safe refactors.
- Runtime-safe wiring.
- Stabilization work.

Handoffs should name the operational gap, the governing documents, the files touched, the runtime path affected, what was observed, and what remains deferred.
