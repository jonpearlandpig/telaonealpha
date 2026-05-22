# TELAOne Constitutional Runtime Rules

**Canonical authority:** This document governs all runtime implementation decisions for TELAOne and ShowTELA.
**Precedence:** This document supersedes implementation comments, inline decisions, and exploratory notes.
**Maintained by:** Runtime Governance Lead, under Sovereign Authority (Jon Hartman).

---

## I. Runtime Authority Hierarchy

1. **Sovereign Authority** — Jon Hartman. Final word on all architecture-affecting decisions.
2. **Runtime Governance Lead** — Enforces these rules. Escalates unresolved conflicts to Sovereign Authority.
3. **Design Governance Lead** — Enforces cinematic hierarchy and operational calm at the surface layer.
4. **Deployment Governance Lead** — Enforces release safety and configuration continuity.
5. **Feature Implementers** — Ship within the rules defined here. Do not reinterpret them.

No implementer authority overrides governance authority. No governance authority overrides sovereign authority.

---

## II. Canonical Doctrine Precedence

When rules conflict, apply in this order:

1. Sovereign ruling (explicit, in-session)
2. `AGENTS.md` (checked into the codebase — governance constitution)
3. This document (`docs/CONSTITUTIONAL_RUNTIME_RULES.md`)
4. Domain-specific docs (`docs/runtime/`, `docs/constitutional/`)
5. Implementation code

Lower-precedence sources are valid only where higher-precedence sources are silent.

---

## III. Operational Surfaces Are Derived State

Operational surfaces — feed cards, rails, pressure indicators, timeline items — are derived from canonical data. They do not define it.

**Rules:**
- A surface showing incorrect data is a retrieval or mapping failure. Fix the source or the mapping, not the surface.
- No surface may hold state that is not traceable to a canonical source.
- Surfaces must not substitute inference output for canonical operational state without explicit provenance labeling.
- When a surface and the canonical source conflict, the canonical source governs.

**Current canonical source:** Notion databases, promoted to Supabase cache (`durable_artifacts`, workspace `tela-showtela`).

---

## IV. Append-Only Integrity

- Operational records are append-only. Corrections create new records; they do not overwrite prior records.
- Lineage chains must remain intact even when individual records are superseded or corrected.
- The Supabase operational cache uses deterministic IDs and upsert semantics — this is acceptable because the cache is a derived copy, not a canonical store. The canonical store (Notion) is not mutated by the runtime except through explicit ingestion paths (Pearl Drop, Promotion).
- No runtime path may silently discard an operational record. Discard decisions must be logged with reason.

---

## V. Explainability Requirements

Every operationally significant action must be explainable in four terms:

| Term | Question |
|------|----------|
| **Source** | Where did the triggering information come from? |
| **Authority** | What confidence and provenance does the source carry? |
| **Decision** | What rule or threshold produced this outcome? |
| **Lineage** | What prior operational state does this continue or resolve? |

If an action cannot be explained in these terms, it must not be taken.

Logging is not optional for operational decisions. Silent success is only acceptable for non-operational operations (style, layout, UX animation).

---

## VI. Implementation Restraint

New capabilities are added only when all of the following are true:

1. A specific operational gap is identified and named.
2. The capability fits within an existing constitutional layer.
3. The capability does not introduce new architectural entanglement.
4. The implementation can be removed without breaking continuity.
5. The implementation is explainable in plain terms to the Sovereign Authority.

**Preferred additions:** normalization clarity, retrieval accuracy, lineage visibility, unresolved state resolution, provenance strengthening.

**Not preferred:** additional abstraction layers, inference-driven mutations to canonical state, capabilities that exist to demonstrate sophistication rather than solve an operational problem.

> **Trust comes before intelligence spectacle.**

This means: surface what is known before inferring what is unknown. Prefer stable operational truth over dynamic model output. Expose provenance so operators can evaluate confidence, not just consume results.

---

## VII. Explicitly Forbidden

The following are constitutionally prohibited. They may not be introduced in any form, including as prototypes, experiments, or "temporary" implementations:

### Orchestration Theater
Systems where the appearance of coordination replaces actual operational clarity. Includes: pipeline dashboards with no operational output, multi-step inference chains that produce unverifiable results, and any system where the routing logic is more complex than the work being routed.

### Speculative Graph Systems
Entity graphs, relationship graphs, or knowledge graphs that are constructed speculatively from inference output without ground-truth validation. Graph construction from confirmed canonical records is permitted when it serves a specific retrieval need.

### Autonomous Agent Abstractions
Systems where the runtime makes operational decisions without an explicit, logged, human-readable decision rule. This includes self-directing agents, recursive planners, and any system described as "agentic" in its operational behavior. Tools that assist human operators are permitted. Tools that replace human judgment without traceability are not.

### Recursive Runtime Abstractions
Runtimes that manage other runtimes, orchestrators that spawn sub-orchestrators, and systems whose operational behavior cannot be traced through a linear code path. Complexity must be in the data, not in the control structure.

### Non-Explainable Operational Logic
Any operational decision produced by a model or algorithm where the inputs, the rule applied, and the output cannot be logged and read by a human operator. Black-box scoring, opaque ranking, and silent filtering are prohibited on operational data.

---

## VIII. Constitutional Implementation Rules

1. **Layer ownership is enforced.** Canonical data lives in Notion. The Supabase cache is a derived copy. Derived surfaces read from the cache. No layer may write directly into a higher-authority layer's canonical store.
2. **Provider abstraction is maintained.** Inference providers (Claude, Whisper, OpenAI) must be replaceable without continuity loss. No inference provider may be the sole authority for an operational record.
3. **Memory tiers are explicit.** Volatile records are labeled as such. Canonical promotion requires explicit confirmation — it does not happen automatically.
4. **Continuity before optimization.** Unresolved operational state must be preserved before any performance optimization is applied. A faster result that loses operational context is worse than a slower result that preserves it.
5. **Retrieval is entity-first.** Operational context is hydrated by entity and relationship, not by flat text retrieval alone.
6. **Artifacts are runtime objects.** Outputs carry lineage, provenance, and continuity references. They are not ephemeral chat blobs.
7. **Deployment is stable-first.** No deployment mutation may compromise continuity restoration or operational identity.
8. **Failures surface visibly.** Silent fallbacks that serve empty or degraded state without operator notification are prohibited for operational data. Diagnostic state must be logged and, where appropriate, surfaced.
