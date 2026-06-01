# ShowTELA Alpha Repo Status

Audit date: 2026-06-01

## Executive Status

**Repo state: RED for release from current checkout.**

The repository has working runtime code and passing tests, but the current local checkout cannot produce a production build. The branch also contains substantial uncommitted and untracked work, including new API routes, lifecycle code, venue intelligence, readiness reviews, and migrations.

## Branch And Remote State

| Item | Status |
| --- | --- |
| Current branch | `showtela-lifecycle-phase1` |
| Current HEAD | `e6adece3ac8f1b2f6a223d76aa69f00194092521` |
| Current HEAD labels | `showtela-june1-rc1` tag, `origin/showtela-june1-rc1`, local `work`, local `proof-lock` |
| Remote default | `origin/HEAD -> origin/main` |
| Local `main` vs `origin/main` | Local `main` is **ahead 2 / behind 44** |
| Current branch vs `origin/main` | Current branch is **ahead 16 / behind 0** |
| Open PRs | GitHub public PR page shows **0 open PRs / 86 closed** |
| GitHub CLI | Not installed locally: `gh: command not found` |

## Unmerged And Local-Only Work

### Modified Tracked Files

There are 20 modified tracked files:

- `src/app/api/showtela-data/route.ts`
- `src/app/page.tsx`
- `src/app/showtela/page.tsx`
- `src/components/showtela/OpeningSurface.tsx`
- `src/components/showtela/ShowTelaRuntime.tsx`
- `src/components/showtela/ShowTelaShell.tsx`
- `src/components/showtela/types.ts`
- `src/lib/continuity/ingest-runtime.ts`
- `src/lib/entities/entityEngine.ts`
- `src/lib/runtime/entityGraph.ts`
- `src/lib/runtime/objects/objectPersistenceWiring.test.mts`
- `src/lib/runtime/ontology/objectNormalization.ts`
- `src/lib/runtime/operationalState.ts`
- `src/lib/runtime/replay/derivedArtifacts.ts`
- `src/lib/runtime/runtimeHydration.ts`
- `src/lib/runtime/runtimeHydrationModel.ts`
- `src/lib/showtela/buildViewModel.test.mts`
- `src/lib/showtela/buildViewModel.ts`
- `src/lib/showtela/runtimeAuthority.test.mts`
- `src/lib/showtela/types.ts`

### Untracked Local Files

There are 30 untracked files/directories, including:

- Audit/release docs: `PR87_CONFLICT_AUDIT.md`, `PROOF_LOCK_VALIDATION.md`, `RELEASE_CANDIDATE_REPORT.md`, `SHOWTELA_LANGUAGE_AUDIT.md`, `SHOWTELA_LIFECYCLE_PLAN.md`
- New routes: `src/app/api/showtela/`, `src/app/api/venue-intelligence/`, `src/app/showtela/archive/`, `src/app/showtela/build/`, `src/app/showtela/venues/`
- New components: `BuildShowTelaLauncher.tsx`, `VenueUploadPanel.tsx`
- New runtime libraries/tests: `src/lib/showtela/continuityEvents*`, `lifecycle*`, `readiness*`, `src/lib/venue-intelligence/`
- New migrations: `20260531143000_venue_intelligence_v1.sql`, `20260531170000_readiness_reviews_v1.sql`

## Migration Status

Migration files present:

- `20260523102000_constitutional_events.sql`
- `20260526174000_runtime_replay_hardening.sql`
- `20260526190000_operational_state_projection_v1.sql`
- `20260526210000_canonical_objects_v1.sql`
- `20260531143000_venue_intelligence_v1.sql`
- `20260531170000_readiness_reviews_v1.sql`

Runtime persistence health check returned healthy:

- `persistenceHealthy: true`
- `runtimeEventsAvailable: true`
- `enforcementPersistenceAvailable: true`
- `replayPersistenceReady: true`
- `escalationPersistenceReady: true`
- Supabase connected: `true`

Important limitation: this confirms required runtime tables are reachable. It does **not** prove every migration file has been applied through a migration ledger.

## Environment Requirements

Required or core environment variables found in templates:

- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NOTION_API_KEY`
- `NOTION_SHOWTELA_PEOPLE_DB_ID`
- `NOTION_SHOWTELA_OPERATIONS_DB_ID`
- `NOTION_SHOWTELA_CONTINUITY_DB_ID`

Optional/richer runtime variables:

- `NOTION_SHOWTELA_UNRESOLVED_DB_ID`
- `NOTION_SHOWTELA_ARTIFACTS_DB_ID`
- `NOTION_TELA_INBOX_DB_ID`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SHOWTELA_LAST_SEEN_TIMESTAMP`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_ID`
- `NEXT_PUBLIC_SHOWTELA_DEBUG_UI`

Local `.env.local` currently contains only:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Local Notion, Anthropic, OpenAI, and Telegram variables are not present.

## Verification Results

| Command | Result |
| --- | --- |
| `npm test` | GREEN: 102 passing, 0 failing |
| `npm run lint` | YELLOW: 0 errors, 17 warnings |
| `npm run build` | RED: fails TypeScript compile |

## Build Warnings

`next build` warning:

- Next.js inferred workspace root as `/Users/jonhartman` because multiple lockfiles exist.
- It detected both `/Users/jonhartman/package-lock.json` and this repo's `package-lock.json`.
- Recommended fix from Next: set `outputFileTracingRoot` or remove the extra lockfile if not needed.

`eslint` warning count:

- 17 warnings.
- Main categories: unused variables, React hook dependency warnings, raw `<img>` warnings, and one unused eslint-disable directive.

## Build Error

`npm run build` fails in:

`src/lib/showtela/lifecycleRegistry.ts:86`

Error:

```text
Type error: A type predicate's type must be assignable to its parameter's type.
Type 'ActiveShowTela' is not assignable...
Property 'archivedAt' is optional in type 'ActiveShowTela' but required...
```

Production build status from this checkout: **BROKEN**.

