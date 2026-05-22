# Constitutional Runtime Rules

## Authority

This document is the canonical constitutional reference for the TELAOne runtime.
It extends the governance structure defined in `AGENTS.md` with implementation-level rules.

---

## Runtime Authority Hierarchy

1. **Sovereign Authority** — Jon Hartman. Final confirmation on all architecture-affecting decisions.
2. **Runtime Governance Lead** — Enforces continuity-first cognition, memory integrity, and provider abstraction boundaries.
3. **Design Governance Lead** — Enforces cinematic hierarchy, operational calm, and tactile interaction discipline.
4. **Deployment Governance Lead** — Ensures release safety, local-first survivability, and zero configuration drift.
5. **Continuity Operators** — Preserve unresolved state, thread recovery, lineage visibility, and artifact traceability.
6. **Feature Implementers** — Ship within constitutional constraints.

No implementer may override governance authority. No governance role may override sovereign authority.

---

## Constitutional Precedence

When rules conflict, apply precedence in this order:

1. Sovereign ruling (explicit, in-session)
2. `AGENTS.md` (checked into the codebase)
3. This document (`CONSTITUTIONAL_RUNTIME_RULES.md`)
4. Domain-specific docs (`INGESTION_ARCHITECTURE.md`, `AKB_MODEL.md`, `ARTIFACT_RULES.md`)
5. Implementation comments and local decisions

Lower-precedence rules are valid only when higher-precedence rules are silent on the matter.

---

## Implementation-Safe Doctrine

> **Trust comes before intelligence spectacle.**

The runtime must:
- Surface what is known before inferring what is unknown.
- Prefer stable operational truth over dynamic inference output.
- Expose provenance so operators can evaluate confidence, not just consume results.
- Fail visibly and safely rather than silently degrade.

The runtime must not:
- Substitute model output for authoritative operational state.
- Use confidence to suppress lineage or provenance visibility.
- Allow inference layers to mutate canonical memory directly.

---

## Append-Only Integrity

- Operational records are append-only. Corrections create new records; they do not overwrite prior records.
- Lineage chains must be preserved intact even when individual records are superseded.
- No runtime operation may delete a canonical memory record without sovereign authorization.
- Volatile records may be expired after promotion evaluation, but their lineage must remain traceable.

---

## Explainability Requirements

Every operationally significant action must be explainable in terms of:
- **Source** — where did the triggering information come from?
- **Authority** — what confidence and provenance does the source carry?
- **Decision** — what rule or threshold produced this outcome?
- **Lineage** — what prior operational state does this action continue or resolve?

If an action cannot be explained in these terms, it must not be taken.

---

## Operational Restraint

The runtime governs by restraint. New capabilities are added only when:
- A specific operational gap is identified.
- The capability fits within an existing constitutional layer.
- The capability does not introduce new architectural entanglement.
- The implementation can be removed without breaking the continuity model.

Preferred additions: normalization, retrieval clarity, lineage visibility, unresolved state resolution.
Rejected additions: orchestration abstractions, speculative inference pipelines, autonomous agent loops, recursive runtime expansion.

---

## Constitutional Implementation Rules

1. **Layer ownership is enforced.** Each layer owns its data. No layer may write directly into another layer's canonical store.
2. **Provider abstraction is non-negotiable.** Inference providers must be replaceable without continuity loss.
3. **Memory tiers are explicit.** `canonical` and `volatile` tiers must be tracked and distinguished at all times.
4. **Continuity before optimization.** Unresolved operational state must be preserved before any performance optimization is applied.
5. **Retrieval is entity-first.** Operational context is hydrated by entity and relationship, not by flat document retrieval alone.
6. **Artifacts are runtime objects.** Outputs carry lineage, provenance, and continuity references — they are not ephemeral chat blobs.
7. **Deployment is stable-first.** No deployment mutation may compromise continuity restoration or operational identity.
