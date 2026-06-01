# ShowTELA Baseline v1

Baseline date: 2026-06-01

This is the known-good release baseline after build recovery. Future ShowTELA work starts from this reality.

## Baseline Verdict

**Release confidence restored for build and deployment verification.**

The repository now builds from the current release baseline branch. ShowTELA has a real persisted runtime backed by Supabase data. The founder-facing runtime can show continuity, people, operations, calendar-derived state, messages/TELA, and play/feed surfaces.

This baseline is not a claim that every intended founder journey is complete.

## Verified Commands

```bash
npm run build
npm test
npm run lint
```

Results:

- Build: success.
- Tests: 102 passing, 0 failing.
- Lint: 0 errors, 17 warnings.

## Working Features

| Feature | Reality |
| --- | --- |
| Production build | Builds successfully after lifecycle registry type fix. |
| Runtime persistence health | Supabase persistence health reports healthy locally. |
| ShowTELA home runtime | Loads persisted `tela-showtela` runtime data in local proof mode. |
| Continuity view | Displays continuity timeline and dispatch feed from stored evidence. |
| People/entity surface | Displays active people/operators from runtime data. |
| Operations surface | Displays operational rooms/operations from runtime data. |
| Calendar data | Runtime data includes 32 calendar events and calendar UI surfaces exist. |
| Play surface | Displays `Crusade Brief` feed items. |
| Messages/TELA surface | Displays quick asks, pinned runtime summary, thread presence, and linked entities. |
| Auth redirect | Anonymous `/showtela` production access redirects to `/signin`. |
| Sign-in page | Google sign-in page renders in local and production. |
| Runtime health APIs | Replay, health, and persistence routes exist and are buildable. |

## Partial Features

| Feature | Reality |
| --- | --- |
| Google OAuth login | Sign-in page exists. Full real-user OAuth was not completed in this recovery session. |
| Document upload | Upload UI/API exist. Prior proof found Anchor upload worked but Calendar upload stalled. This recovery did not mutate live data. |
| Create continuity | Continuity ingest UI/API exist. Not re-tested with a live mutation during recovery. |
| Return-later continuity | Persistence is healthy and stored state reloads. Full authenticated close/reopen production journey was not completed. |
| ShowTELA lifecycle registry | Buildable after type fix. Functional creation/archive path depends on auth and Supabase runtime events. |
| Venue intelligence | Buildable route and upload API exist. Not founder-verified end-to-end. |
| Readiness reviews | Buildable API and replay mapping exist. No readiness reviews present in current runtime data. |
| Voice capture | UI/API paths exist. Not verified with real microphone/transcription in this recovery session. |

## Broken Or Missing Features

| Feature | Reality |
| --- | --- |
| Invite another user | No dedicated invite flow found. |
| Share continuity | No dedicated share continuity flow found. |
| Clean June 1 proof workspace | Current `tela-showtela` data is already populated, not clean. |
| Zero-warning build/lint | Build succeeds but warnings remain: workspace-root inference and Node `url.parse()` deprecation during build; lint has 17 warnings. |

## Current Runtime Snapshot

Loaded local proof runtime data for `tela-showtela`:

- Source: Supabase.
- Diagnostic state: `persistence-connected`.
- People: 45.
- Operations: 31.
- Calendar events: 32.
- Artifacts: 114.
- Feed items: 23.
- Unresolved: 0.
- Readiness reviews: 0.

## Governance Rule For Future Work

Future work must not claim a feature is complete unless it has been verified through the actual user journey.

This baseline protects:

- Build confidence.
- Deployment confidence.
- Runtime continuity visibility.
- Truthful distinction between working, partial, and broken features.

