# Legacy Runtime Warning

## Status

Documents and code in this archive are **not active runtime authority**.

They are retained for lineage and historical reference only. They must not be treated as:
- Constitutional governance documents
- Implementation specifications
- Active design references
- Sources of truth for current runtime behavior

---

## What Belongs in Archive

- Exploratory design documents superseded by constitutional documents
- Prior architecture proposals that were not adopted
- Experimental pipeline designs that were not promoted to implementation
- Draft specifications replaced by finalized runtime documents

---

## What Does Not Belong in Archive

- Active constitutional documents (those live in `/docs/constitutional/`)
- Active runtime specifications (those live in `/docs/runtime/`)
- Checked-in production code (that lives in `/src/`)
- Current governance rules (those live in `AGENTS.md`)

---

## Using Archived Documents

If you reference an archived document during implementation:

1. Verify that no active document in `/docs/constitutional/` or `/docs/runtime/` supersedes it.
2. If an active document exists, use that document — not the archive.
3. If the archive document contains information not covered by active documents, escalate to the Runtime Governance Lead before using it as a reference.
4. Do not promote archived content to active runtime rules without governance review and sovereign confirmation.

---

## Constitutional Precedence

Archived documents have **no precedence** in the constitutional hierarchy defined in `CONSTITUTIONAL_RUNTIME_RULES.md`. They are below all active documents, including implementation comments.

When archived content conflicts with any active document, the active document governs.

---

## Retention Policy

Archived documents are retained indefinitely for lineage purposes. They are not deleted because their existence is part of the operational history of the runtime. Deletion requires sovereign authorization and an audit record explaining why the lineage reference is no longer needed.
