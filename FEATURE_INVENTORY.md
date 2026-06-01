# ShowTELA Alpha Feature Inventory

Audit date: 2026-06-01

Status legend: Complete, Partial, Broken, Untested.

## Runtime Data Snapshot

Local dev runtime with proof bypass loaded `tela-showtela` from Supabase:

- Source: `supabase`
- Diagnostic state: `persistence-connected`
- People: 45
- Operations: 31
- Calendar events: 32
- Artifacts: 114
- Feed items: 23
- Unresolved: 0
- Readiness reviews: 0

## Features

| Feature | Purpose | Status | Dependencies | Files involved |
| --- | --- | --- | --- | --- |
| Google sign-in | Authenticate users through Google OAuth and session cookie | Partial | `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `src/app/signin/page.tsx`, `src/app/api/auth/callback/route.ts`, `src/app/api/auth/signout/route.ts`, `src/lib/auth.ts`, `src/middleware.ts` |
| Auth-gated ShowTELA access | Redirect anonymous users away from runtime | Complete | Session cookie | `src/middleware.ts`, `src/lib/auth-config.ts` |
| Local proof bypass | Allow unauthenticated local runtime QA using `showtela_proof=1` | Complete locally, production disabled | `NODE_ENV !== production` | `src/middleware.ts` |
| ShowTELA home runtime | Render continuity-first operational home | Partial | Supabase durable memory, runtime hydration | `src/app/showtela/page.tsx`, `src/components/showtela/ShowTelaRuntime.tsx`, `src/components/showtela/ShowTelaShell.tsx`, `src/lib/runtime/runtimeHydration.ts`, `src/lib/showtela/buildViewModel.ts` |
| Runtime hydration | Load runtime state and build view model | Partial | Supabase, optional Notion | `src/app/api/showtela-data/route.ts`, `src/lib/runtime/runtimeHydration.ts`, `src/lib/showtela/buildViewModel.ts`, `src/lib/showtela/runtimeAuthority.ts` |
| Continuity timeline | Display replayed continuity events and stored evidence | Partial | Runtime events, durable artifacts | `src/components/showtela/ShowTelaShell.tsx`, `src/lib/showtela/continuityEvents.ts`, `src/lib/showtela/buildViewModel.ts` |
| Continuity ingest | Add text/file/link/photo continuity into runtime | Partial | Supabase persistence, optional Notion inbox, optional file text extraction | `src/components/runtime/continuity-ingest.tsx`, `src/app/api/runtime/continuity/ingest/route.ts`, `src/lib/continuity/ingest-runtime.ts`, `src/lib/continuity/normalize-ingestion.ts` |
| File upload into continuity | Stage files/photos as continuity artifacts | Partial | Browser file input, Supabase persistence, text extraction only for text-like files | `src/components/runtime/continuity-ingest.tsx`, `src/lib/continuity/ingest-runtime.ts` |
| Play tab | Show current movement/feed as a "Crusade Brief" | Partial | Existing feed data | `src/components/showtela/ShowTelaShell.tsx`, `src/components/showtela/BottomDock.tsx` |
| Messages/TELA tab | Ask basic operational questions against loaded runtime context | Partial | Local client state, optional continuity submit | `src/components/showtela/TelaTalk.tsx`, `src/components/showtela/ShowTelaShell.tsx` |
| Calendar surface | Render operational calendar from hydrated or derived events | Partial | Calendar events in VM or derived feed/ops data | `src/components/showtela/OperationalCalendar.tsx`, `src/components/showtela/CalendarWeekRail.tsx`, `src/lib/showtela/calendar.ts` |
| Active operators rail | Display people/entities and open profile sheets | Partial | Active ops data from hydration | `src/components/showtela/ActiveOpsRail.tsx`, `src/components/showtela/sheets/PersonSheet.tsx` |
| Operations rail | Display operational rooms and operation sheet | Partial | Crusade operations data | `src/components/showtela/CrusadeOperationsRail.tsx`, `src/components/showtela/sheets/OperationSheet.tsx` |
| Unresolved pressure | Show unresolved pressure and sheet | Partial | Unresolved items | `src/components/showtela/UnresolvedPressureCard.tsx`, `src/components/showtela/sheets/UnresolvedSheet.tsx` |
| ShowTELA lifecycle registry | Create/list/archive named ShowTELAs | Broken in production build | Supabase `runtime_events`; lifecycle type code currently fails build | `src/app/page.tsx`, `src/app/showtela/build/route.ts`, `src/app/showtela/archive/route.ts`, `src/app/api/showtela/build/route.ts`, `src/lib/showtela/lifecycle.ts`, `src/lib/showtela/lifecycleRegistry.ts` |
| Venue intelligence | Upload venue packets and score readiness against rider | Partial | Supabase, optional Anthropic for richer extraction | `src/app/showtela/venues/page.tsx`, `src/components/showtela/VenueUploadPanel.tsx`, `src/app/api/venue-intelligence/upload/route.ts`, `src/lib/venue-intelligence/*` |
| Readiness reviews | Persist and replay readiness review records | Partial | Supabase migrations/tables, auth for writes | `src/app/api/showtela/readiness-reviews/route.ts`, `src/app/api/showtela/readiness-reviews/[reviewId]/route.ts`, `src/lib/showtela/readiness.ts` |
| Runtime health APIs | Read-only health/replay/persistence observability | Complete for available tables | Supabase runtime tables | `src/app/api/runtime/health/route.ts`, `src/app/api/runtime/replay/route.ts`, `src/app/api/runtime/persistence/route.ts`, `src/lib/runtime/observability/*` |
| Telegram operator | Local Telegram relay/operator runtime | Untested | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_ID` | `operator/index.ts`, `operator/telegram/*`, `operator/runtime/*` |
| Voice capture | Client voice capture/transcription path | Untested | Browser media, `OPENAI_API_KEY` for transcription, optional Anthropic | `src/components/showtela/PearlDropVoice.tsx`, `src/app/api/transcribe-audio/route.ts`, `src/app/api/pearl-drop-voice/route.ts` |
| Invite another user | Invite collaborator into ShowTELA | Broken/not implemented | None found | No dedicated invite UI/API found |
| Share continuity | Share continuity externally | Broken/not implemented | None found | No dedicated share UI/API found |

## Cross-Cutting Runtime Risks

- Production build is blocked by lifecycle registry TypeScript.
- Local browser QA showed a React hydration mismatch warning in ShowTELA runtime.
- Local env lacks Notion and AI keys, so Notion/AI-dependent paths were not locally verifiable.
- Upload flows were not submitted during this audit to avoid mutating live Supabase state from an audit run.

