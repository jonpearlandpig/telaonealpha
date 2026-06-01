# ShowTELA Alpha User Journey Audit

Audit date: 2026-06-01

Legend:

- GREEN: verified usable in this audit.
- YELLOW: exists or partially works, but has blockers, warnings, missing proof, or unsafe verification gap.
- RED: not usable or not implemented.

## Test Context

Runtime checks used local dev server:

- `http://127.0.0.1:3002`
- Local proof bypass: `/showtela?showtela_proof=1`
- Production check: `https://telaonealpha.vercel.app/showtela?workspace=tela-showtela`

Important: production redirects anonymous users to `/signin`, so authenticated production runtime was not tested end-to-end in this audit.

## Journey Results

| Step | Status | Evidence |
| --- | --- | --- |
| 1. Log in | YELLOW | `/signin` renders Google sign-in on local and production. Full OAuth was not completed in audit. Local env has Google keys, but real user auth was not exercised. |
| 2. Reach Home | YELLOW | Anonymous production user is redirected to `/signin`. Local proof bypass reaches the ShowTELA home and loads live Supabase data. Authenticated production home was not verified. |
| 3. Reach Play | YELLOW | Local proof runtime can reach Play and shows `Crusade Brief` with feed items. Browser click by exact text had ambiguity, but clicking the bottom nav ref worked in one chain. |
| 4. Reach Messages | YELLOW | Local proof runtime can reach Messages. It shows quick asks, Ask box, pinned summary, thread presence, and linked entities. Actual ask/response behavior was not submitted. |
| 5. Reach Calendar | YELLOW | Calendar data is present and the calendar route state exists via `surface=history`, but the URL parameter did not reliably render calendar text output on first text capture. Snapshot showed calendar controls. Needs cleaner validation. |
| 6. Upload document | YELLOW | Upload UI and API exist. Prior release report says Anchor upload worked but Calendar upload stalled in production. This audit did not submit uploads to avoid mutating live Supabase state. |
| 7. Create continuity | YELLOW | Continuity ingest UI/API exist and persisted data is visible. This audit did not create new continuity because the target Supabase appears live. |
| 8. View continuity | GREEN | Local proof runtime showed continuity timeline, feed, counts, people, operations, calendar events, and historical continuity items from Supabase. |
| 9. Invite another user | RED | No dedicated invite user flow, UI, or API found. |
| 10. Share continuity | RED | No dedicated share continuity flow, UI, or API found. URL sharing exists only as raw route/query behavior, not a product share workflow. |

## Observed Runtime Issues

Local browser console showed:

- React hydration mismatch warning in `ActiveOpsRail` layout/classes.
- Many server warnings: `artifact payload missing createdAt; falling back to durable row`.

Production anonymous route behavior:

- `/showtela?workspace=tela-showtela` redirects to `/signin`.
- `/signin` loads.
- Console showed one 404 resource while loading production sign-in.

## Bottom Line

The core runtime can display continuity when bypassed locally or when already authenticated. The founder path is not fully proven because login, safe document upload, invite, share, and return-later authenticated production behavior were not all validated end-to-end.

