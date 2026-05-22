# SUBSTRATE FREEZE — V1

**Freeze date:** 2026-05-22
**Scope:** ShowTELA / TELAOne runtime substrate.
**Authority:** `AGENTS.md`, `docs/CONSTITUTIONAL_RUNTIME_RULES.md`, and active runtime governance documents.

This document formally freezes the ShowTELA / TELAOne runtime substrate after successful stabilization and constitutional validation.

## Current Runtime Status

The runtime substrate is now considered operationally stable.

The active runtime path has been validated across hydration, refresh behavior, ViewModel propagation, client hydration, and runtime-critical lint rules. Remaining work belongs to surface evolution unless an explicit unfreeze condition is met.

## Rationale for Freeze

The substrate has reached the required trust threshold:

- SSR and refresh truth are aligned.
- Continuity data is preserved through the runtime path.
- Client hydration is free of known runtime exceptions.
- Runtime-critical lint failures are resolved.
- Degradation behavior is explicit and diagnosable.

Runtime trust takes precedence over novelty.

## Frozen Layers

The following layers are frozen:

- Auth and session architecture.
- Continuity semantics.
- Runtime degradation behavior.
- Hydration contract.
- ViewModel propagation contract.
- Truth flow:

```text
Notion → normalization → hydration → ViewModel → operational surfaces
```

These layers may receive defect fixes only when the defect threatens continuity integrity, runtime trust, or constitutional compliance.

## Allowed Evolution Zones

The next approved phase is:

```text
Atmospheric Operational UX
```

Allowed work:

- Surface UX refinement.
- Atmospheric operational presentation.
- Visual hierarchy improvements.
- Interaction polish within existing runtime contracts.
- Copy and layout changes that do not alter runtime truth.
- Accessibility improvements that preserve existing behavior.

Surface UX evolution is allowed. Runtime substrate churn is not.

## Prohibited Architectural Churn

The following are prohibited unless the substrate is formally unfrozen:

- Auth rewrites.
- Persistence rewrites.
- Hydration redesign.
- ViewModel contract replacement.
- Continuity semantic changes.
- Speculative orchestration systems.
- Autonomous or recursive runtime abstractions.
- New cache authority models.
- Inference-driven mutation of canonical state.
- New normalization architecture.

No speculative orchestration systems are allowed. No persistence rewrites are allowed.

## Unfreeze Conditions

The substrate may be unfrozen only if one or more of the following conditions is met:

- Production runtime crash tied to frozen substrate behavior.
- Verified continuity loss.
- Auth/session failure that blocks legitimate operators.
- Hydration failure that cannot degrade honestly.
- Constitutional conflict between implementation and governing documents.
- Explicit sovereign authorization.

Unfreeze must be documented before architectural work begins.

## Constitutional Principles

- Repo governance overrides conversational assumptions.
- Constitutional docs remain the source of implementation authority.
- Runtime truth governs derived surfaces.
- Continuity integrity must be preserved.
- Degraded state must be visible and explainable.
- Stabilization precedes expansion.
- Trust comes before intelligence spectacle.

This freeze does not end development. It defines the boundary between runtime substrate and surface evolution.
