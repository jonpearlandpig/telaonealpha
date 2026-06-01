# SHOWTELA Language Audit

Date: 2026-05-31

Scope:
- Founder-facing language only
- No code changes
- Internal implementation terms intentionally excluded unless they leak into founder-visible surfaces

Audit target terms:
- `workspace`
- `workspaceId`
- `workspace name`
- `workspace selector`
- `workspace creation`
- `workspace archive`

## Summary

Blast radius found in founder-facing surfaces:
- Founder proof docs: HIGH
- Validation / release docs shared with founder context: HIGH
- Browser URL / query exposure: MEDIUM
- In-product visible UI copy: LOW

Immediate finding:
- Literal founder-facing `workspace` language appears primarily in runbooks and validation artifacts.
- Literal founder-facing `workspaceId` copy was not found in visible UI labels, but `workspace` and `workspaceId` remain exposed in URLs and query handling, which is founder-visible in the browser and share links.
- No founder-facing `workspace selector`, `workspace creation`, or `workspace archive` UI was found yet.

## Findings

| File | Line | UI Surface | Current Founder-Facing Occurrence | Replacement Recommendation |
|---|---:|---|---|---|
| `FOUNDER_PROOF_RUNBOOK.md` | 5 | Founder proof runbook | `Use the June 1 proof workspace.` | Replace with `Use the June 1 proof ShowTELA.` |
| `FOUNDER_PROOF_RUNBOOK.md` | 19 | Founder proof runbook | `Open the June 1 proof workspace.` | Replace with `Open the June 1 proof ShowTELA.` |
| `FOUNDER_PROOF_RUNBOOK.md` | 85 | Founder proof runbook | `The workspace looks complete.` | Replace with `The ShowTELA looks complete.` |
| `FOUNDER_PROOF_RUNBOOK.md` | 91 | Founder proof runbook | `Reopen the same workspace.` | Replace with `Reopen the same ShowTELA.` |
| `FOUNDER_PROOF_RUNBOOK.md` | 96 | Founder proof runbook | `Check the same workspace again.` | Replace with `Check the same ShowTELA again.` |
| `FOUNDER_PROOF_RUNBOOK.md` | 98 | Founder proof runbook | `If the wrong workspace opens:` | Replace with `If the wrong ShowTELA opens:` |
| `FOUNDER_PROOF_RUNBOOK.md` | 99 | Founder proof runbook | `Go back to the June 1 proof workspace and continue there.` | Replace with `Go back to the June 1 proof ShowTELA and continue there.` |
| `FOUNDER_PROOF_RUNBOOK.md` | 109 | Founder proof runbook | `The workspace feels ready to show.` | Replace with `The ShowTELA feels ready to show.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 7 | Founder launch checklist | `Confirm the June 1 proof workspace opens.` | Replace with `Confirm the June 1 proof ShowTELA opens.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 11 | Founder launch checklist section heading | `Workspace Setup` | Replace with `ShowTELA Setup` or `Open ShowTELA`. |
| `JUNE1_LAUNCH_CHECKLIST.md` | 13 | Founder launch checklist | `Open the June 1 proof workspace.` | Replace with `Open the June 1 proof ShowTELA.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 45 | Founder launch checklist | `The workspace feels complete.` | Replace with `The ShowTELA feels complete.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 57 | Founder launch checklist | `Reopen the same workspace.` | Replace with `Reopen the same ShowTELA.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 62 | Founder launch checklist | `Check the same workspace again.` | Replace with `Check the same ShowTELA again.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 65 | Founder launch checklist | `Return to the June 1 proof workspace.` | Replace with `Return to the June 1 proof ShowTELA.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 72 | Founder launch checklist | `The proof depends on the three files being loaded into the right workspace.` | Replace with `The proof depends on the three files being loaded into the right ShowTELA.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 78 | Founder launch checklist | `Leave the June 1 proof workspace open.` | Replace with `Leave the June 1 proof ShowTELA open.` |
| `JUNE1_LAUNCH_CHECKLIST.md` | 81 | Founder launch checklist | `Save the exact workspace link that was used for the demonstration.` | Replace with `Save the exact ShowTELA link used for the demonstration.` Prefer eventually removing `?workspace=` from the visible URL. |
| `RELEASE_CANDIDATE_REPORT.md` | 20 | Release / founder verification artifact | `Proof Workspace` | Replace with `Proof ShowTELA`. |
| `RELEASE_CANDIDATE_REPORT.md` | 22 | Release / founder verification artifact | `Workspace id: tela-showtela` | Replace with `Internal ShowTELA key: tela-showtela` if this document remains engineering-facing. If founder-facing, remove the identifier entirely. |
| `RELEASE_CANDIDATE_REPORT.md` | 23 | Shared proof URL | `showtela?workspace=tela-showtela` | Founder-visible URL should move toward a ShowTELA-native route such as `/showtela/crusade-2027` or `/showtela/<slug>`. Keep `workspace` internal. |
| `RELEASE_CANDIDATE_REPORT.md` | 30 | Release / founder verification artifact | `Workspace open` | Replace with `Open ShowTELA`. |
| `RELEASE_CANDIDATE_REPORT.md` | 31 | Shared proof URL | `Production /showtela?workspace=tela-showtela opened` | Replace with ShowTELA-native routing language. Avoid exposing `workspace` in founder-readable verification notes. |
| `RELEASE_CANDIDATE_REPORT.md` | 48 | Release / founder verification artifact | `Deployed workspace counts before verification uploads` | Replace with `Deployed ShowTELA counts before verification uploads`. |
| `RELEASE_CANDIDATE_REPORT.md` | 50 | Release / founder verification artifact | `Deployed workspace counts after Anchor upload` | Replace with `Deployed ShowTELA counts after Anchor upload`. |
| `RELEASE_CANDIDATE_REPORT.md` | 52 | Release / founder verification artifact | `Deployed workspace counts after Calendar upload attempt` | Replace with `Deployed ShowTELA counts after Calendar upload attempt`. |
| `RELEASE_CANDIDATE_REPORT.md` | 57 | Release / founder verification artifact | `The proof workspace is not clean.` | Replace with `The proof ShowTELA is not clean.` |
| `RELEASE_CANDIDATE_REPORT.md` | 58 | Release / founder verification artifact | `The workspace already exceeds...` | Replace with `The ShowTELA already exceeds...` |
| `RELEASE_CANDIDATE_REPORT.md` | 69 | Release / founder verification artifact | `the proof workspace is not in the documented clean baseline state` | Replace with `the proof ShowTELA is not in the documented clean baseline state`. |
| `PROOF_LOCK_VALIDATION.md` | 11 | Validation artifact | `Workspace:` | Replace with `ShowTELA:` if founder-readable. If engineering-only, mark as internal key instead. |
| `PROOF_LOCK_VALIDATION.md` | 59 | Validation artifact | `clean workspace` | Replace with `clean ShowTELA`. |
| `src/app/showtela/page.tsx` | 24 | Browser URL / founder-visible address bar | Reads `params.workspace` from the URL query | Keep internal logic, but founder route should eventually use a ShowTELA-native slug/path instead of a `workspace` query parameter. |
| `src/app/showtela/page.tsx` | 59 | Browser URL / route plumbing | Passes `workspaceId` into runtime component | No founder copy issue, but this supports current founder-visible `?workspace=` routing. Recommend preserving internals and changing only external routing vocabulary later. |
| `src/components/showtela/ShowTelaShell.tsx` | 59 | Browser URL / founder-visible address bar | Reads `workspace` from `window.location.search` | Keep internal logic. Founder-facing routing should translate `ShowTELA` identity to internal `workspace` without exposing the term in the URL. |
| `src/components/showtela/ShowTelaShell.tsx` | 292 | Navigation link / founder-visible URL | Generates `/showtela/venues?workspace=...` | Replace outward route shape with a ShowTELA-native parameter or path segment before founder launch. |
| `src/components/showtela/ShowTelaRuntime.tsx` | 93 | Client fetch / browser network visibility | Fetches `/api/showtela-data?workspaceId=...` | Acceptable as internal transport for now, but do not expose in founder share links or visible UI affordances. |
| `src/app/showtela/venues/page.tsx` | 26 | Browser URL / founder-visible address bar | Reads `params.workspace` | Keep internal. Replace outward route semantics with ShowTELA-native navigation later. |
| `src/app/showtela/venues/page.tsx` | 43 | Back link / founder-visible URL | Generates `/showtela?workspace=...` | Replace with a ShowTELA-native open route such as `Open ShowTELA`. |

## Zero-Hit Categories

No current founder-facing literal occurrences were found for:
- `workspaceId` as visible UI copy
- `workspace name`
- `workspace selector`
- `workspace creation`
- `workspace archive`

That means the current blast radius is mostly:
- proof docs
- validation / release docs
- route and share-link exposure

## Replacement Direction

Founder-facing lifecycle vocabulary should become:
- `Build ShowTELA`
- `Open ShowTELA`
- `Archive ShowTELA`
- `Duplicate ShowTELA`
- `Share ShowTELA`

Founder-facing object naming should become:
- `ShowTELA`
- `ShowTELA name`
- `ShowTELA link`
- `Active ShowTELAs`
- `Archived ShowTELAs`

Internal-only vocabulary that can remain unchanged:
- `workspace`
- `workspaceId`
- `workspace_name`
- schema / route plumbing that does not surface to founders

## Recommended First Pass

1. Replace founder-proof documentation language first.
2. Replace founder-readable validation / release artifact language second.
3. Hide `?workspace=` from founder-facing navigation and share flows third.
4. Introduce lifecycle copy only after the audit-backed copy replacement pass:
   - `Build ShowTELA`
   - `Open ShowTELA`
   - `Archive ShowTELA`

## Audit Verdict

- Founder-facing language is not yet compliant.
- Main failure mode is vocabulary drift, not architecture.
- The largest immediate risk is that founders are taught the wrong mental model through docs and visible URLs.
