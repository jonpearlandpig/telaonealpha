# Runtime Layer Model

## Overview

TELAOne is organized into five discrete layers. Each layer has bounded responsibilities and a defined data ownership contract. Layers communicate upward through retrieval and downward through ingestion — never through direct writes across layer boundaries.

---

## Layer Definitions

### Layer 1 — Operational Runtime Layer

**Owns:** Live operational state. Active threads. Unresolved items. In-flight continuity.

**Responsibilities:**
- Maintain the current operational picture: what is active, what is unresolved, what is in transition.
- Accept ingest events and route them to the appropriate lower layer.
- Surface continuity snapshots to presentation surfaces on demand.

**Truth claim:** What is happening now.

**Does not own:** Historical records, canonical memory, inference outputs, UI rendering.

---

### Layer 2 — Constitutional Infrastructure Layer

**Owns:** Canonical memory. Lineage chains. Provenance records. Memory tier assignment.

**Responsibilities:**
- Store and protect append-only operational records.
- Enforce `canonical` vs `volatile` memory tier separation.
- Preserve lineage integrity across promotions and corrections.
- Reject writes that violate provenance requirements.

**Truth claim:** What has been authoritatively established and retained.

**This layer owns truth.** When operational state conflicts with inference output, this layer's records are authoritative. No other layer may overwrite its canonical records.

---

### Layer 3 — Derived Operational Surfaces

**Owns:** Rendered views, continuity feeds, thread summaries, operational cards.

**Responsibilities:**
- Derive display-ready representations from Layer 1 and Layer 2 data.
- Apply cinematic hierarchy and operational calm to surface presentation.
- Refresh on continuity snapshot events — do not maintain independent state.

**Truth claim:** None. Derived surfaces reflect truth; they do not define it.

**Important:** A derived surface showing stale or incorrect data is a retrieval failure, not a data authority dispute. Fix the retrieval, not the surface data.

---

### Layer 4 — Operational Intelligence Layer

**Owns:** Inference outputs, entity extraction candidates, normalization results, pressure derivations.

**Responsibilities:**
- Process ingested content through normalization and extraction pipelines.
- Produce structured candidates (entities, unresolved items, summaries) for Layer 2 evaluation.
- Operate without direct write access to canonical memory.

**Truth claim:** None. Intelligence layer outputs are candidates, not authoritative records.

**Critical constraint:** This layer proposes; Layer 2 decides. Inference output that has not been evaluated and promoted to `canonical` tier is volatile and must be marked as such.

---

### Layer 5 — Governance & Audit Layer

**Owns:** Constitutional rules, authority records, audit trails, deployment governance state.

**Responsibilities:**
- Enforce the constitutional review chain on architecture-affecting changes.
- Maintain audit records of governance decisions and sovereign rulings.
- Flag violations of operational restraint or layer boundary rules.

**Truth claim:** What is constitutionally authorized.

---

## Layer Interaction Rules

| From | May read from | May write to |
|------|--------------|--------------|
| Layer 1 (Operational Runtime) | Layer 2 | Layer 2 (via ingest) |
| Layer 2 (Constitutional Infrastructure) | — | Layer 2 only (append-only) |
| Layer 3 (Derived Surfaces) | Layer 1, Layer 2 | None |
| Layer 4 (Intelligence) | Layer 1 | Layer 2 (candidates only, volatile tier) |
| Layer 5 (Governance) | All layers | Layer 5 audit records only |

---

## Which Layer Owns Truth

**Layer 2 owns truth.**

When any other layer's output conflicts with Layer 2 canonical records:
- Layer 2 records stand.
- The conflict is surfaced to Layer 5 for audit.
- Resolution requires explicit promotion or sovereign ruling.

No inference output, derived surface, or UI state overrides Layer 2 canonical memory.
