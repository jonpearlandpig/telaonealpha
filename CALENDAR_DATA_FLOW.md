# Calendar Data Flow

## Current State

- Home health read `showTelaHealth.calendarEvents` from `buildShowTelaVMFromHydratedState()`.
- That count was produced by parsing durable artifacts in `collectArtifactViewData()`.
- Calendar screen received `calendarEvents` from `ShowTelaShell`.
- When `vm.calendarEvents` was absent, `ShowTelaShell` generated derived operational placeholders from feed, runtime timeline, unresolved items, and operations.
- Calendar screen also anchored its seven-day horizon to latest continuity/feed activity, which could exclude real imported tour dates.
- Imported calendar artifacts enter through `ingestCanonicalContinuity()`, are persisted as durable artifacts, and emit `showtela.artifact.uploaded` plus `showtela.calendar.hydrated` when parsed events exist.
- Continuity-derived calendar events were previously the fallback output of `buildOperationalCalendarEvents()`, not imported calendar truth.

## Expected State

- Durable artifacts plus replay continuity events hydrate one canonical `calendarEvents` array.
- Home health, Home rail, Calendar, Messages, and Play-adjacent continuity surfaces all receive counts from the same `ShowTelaViewModel`.
- Calendar shows imported event title, date, source artifact, import timestamp, freshness timestamp, and continuity linkage when real events exist.
- Derived placeholders do not count as `calendar_events`.
- If no imported calendar events exist, every surface reports zero calendar events consistently.

## Mismatch Analysis

- The trust break came from two meanings of "calendar event":
  - Home counted imported artifact rows.
  - Calendar could render a seven-day derived horizon or a day with zero selected imported rows.
- The Calendar screen could therefore say "No event selected" while Home reported imported calendar events.
- The fix creates `buildCanonicalCalendarEvents()` in `src/lib/showtela/calendarAuthority.ts` and removes the client fallback from `ShowTelaShell`.
- Calendar now anchors to the first canonical imported event when present.
- Home, Messages, Calendar rail, and Calendar screen all consume `vm.calendarEvents`.
