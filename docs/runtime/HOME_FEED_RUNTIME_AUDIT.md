# Home Feed Runtime Audit

**Classification:** Final micro-stabilization report.
**Scope:** `/showtela` SSR, `/api/showtela-data`, and `/api/home-feed`.

## Exact Divergence Point

`/showtela` SSR and `/api/showtela-data` both use `getShowTelaHome()`.

`getShowTelaHome()`:

1. Attempts Supabase cache read.
2. Falls through to Notion when cache is empty or unavailable.
3. Returns Notion data immediately when Notion succeeds.
4. Writes Supabase cache asynchronously after returning runtime truth.

`/api/home-feed` uses `refreshShowTelaFromNotion()`.

Before this pass, `refreshShowTelaFromNotion()`:

1. Fetched fresh Notion data.
2. Awaited `writeShowTelaCache(data)`.
3. Treated a Supabase write failure as failure of the whole refresh path.
4. Entered the outer `catch`.
5. Attempted stale Supabase fallback.
6. Returned empty state when fallback was unavailable.

That made Notion success dependent on derived cache write success for `/api/home-feed`, but not for SSR.

## Root Cause

The refresh path coupled canonical Notion truth to a derived Supabase cache write.

When Supabase write failed, `/api/home-feed` discarded valid Notion data and returned:

- `source: 'empty'`
- `diagnosticState: 'notion-unavailable'`

SSR did not fail because its cache write is fire-and-forget. `/api/showtela-data` did not fail because it also reads through `getShowTelaHome()`.

The issue was not auth, env validation, or `fetchFromNotion()` divergence. The divergence was the awaited cache write inside `refreshShowTelaFromNotion()`.

## Minimal Fix

`refreshShowTelaFromNotion()` now preserves Notion refresh truth when Notion succeeds and the Supabase cache write fails.

Behavior after fix:

- Notion success returns `source: 'notion'`.
- Notion success returns `diagnosticState: 'persistence-connected'`.
- Failed cache write is logged.
- Hydration summary marks `connectedToSupabase: false` and `supabaseWriteOk: false`.
- Cache fallback still applies only when Notion is empty or throws before returning data.

No endpoint redesign, cache redesign, auth change, or architecture change was introduced.

## Continuity Truth Restoration

Continuity truth is restored for the refresh path.

Local production verification:

- `/api/home-feed`: `source: 'notion'`, `diagnosticState: 'persistence-connected'`, 5 feed items, 5 operations.
- `/api/showtela-data`: `source: 'supabase'`, `diagnosticState: 'persistence-connected'`, live cache-backed data present after refresh write, 5 feed items, 5 operations.
- Authenticated `/showtela`: SSR returned live runtime state.

SSR truth now matches refresh truth at the continuity payload level. The source label may be `notion` or `supabase` depending on whether the derived cache is populated, but the refresh path no longer converts valid Notion truth into empty state.
