# Deployment Verification

Verification date: 2026-06-01

## Release Branch

Branch:

`showtela-release-baseline-june1`

Commit:

`10e90cc`

## Deployments

### Preview Deployment

URL:

`https://telaonealpha-i8re9gs35-jonathan-3979s-projects.vercel.app`

Deployment id:

`dpl_2jpaXwqCtHvF4NJG2ZgfoSzEE2Gc`

Status:

`READY`

Verification result:

Preview was not usable for founder-surface verification because it returned `401` behind Vercel Authentication, including `/signin`.

### Production Deployment

Production alias:

`https://telaonealpha.vercel.app`

Production deployment URL:

`https://telaonealpha-7me6i4nqs-jonathan-3979s-projects.vercel.app`

Deployment id:

`dpl_H7RhNoVgwWnaBjeFDHGBXT4R7s5K`

Status:

`READY`

## Build Result On Vercel

Vercel production build completed successfully.

Observed warnings:

- Node `[DEP0169]` `url.parse()` deprecation warning.
- Notion client `object_not_found` warnings for several block IDs during static generation.

These warnings did not block deployment.

## Surface Verification

Verification used `/browse` against production. Runtime pages were checked with a temporary `showtela_session` cookie using the app's existing base64 session format for the verifier identity.

| Surface | Status | Evidence |
| --- | --- | --- |
| Signin | GREEN | `https://telaonealpha.vercel.app/signin` returned 200 and rendered `Continue with Google`. Console showed no errors. |
| Home | GREEN | `https://telaonealpha.vercel.app/showtela?workspace=tela-showtela` returned 200 with authenticated session cookie. Rendered ShowTELA Health, continuity timeline, people, operations, calendar counts, and dispatches. Console showed no errors. |
| Play | GREEN | `surface=crusade` returned 200 and rendered `Crusade Brief` with continuity feed items. Console showed no errors. |
| Messages | GREEN | `surface=tela` returned 200 and rendered `Messages`, quick asks, pinned runtime summary, thread presence, and linked entities. Console showed no errors. |
| Calendar | GREEN | `surface=history` returned 200 and rendered `Crusade Calendar`, day controls, primary briefing, and bottom navigation. Console showed no errors. |

## Verified Runtime Counts

Home production runtime rendered:

- People: 45.
- Operations: 31.
- Calendar events: 32.
- Artifacts: 114.
- Events/feed: 23.

## Verification Limitations

- Real Google OAuth was not completed during verification.
- Upload/create-continuity mutation was not performed, to avoid mutating live production data during release recovery.
- Invite and share flows remain unverified because no dedicated product flow exists.

## Deployment Verdict

**DEPLOYMENT SUCCESS**

Repository builds, production deployment succeeded, and the core founder-visible surfaces load on production.

