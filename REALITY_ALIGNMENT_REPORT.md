# Reality Alignment Report

## Verification Matrix

GREEN - Home count

Home reads `showTelaHealth.calendarEvents`, now set from canonical `calendarEvents.length`.

GREEN - Calendar count

Calendar receives the same `vm.calendarEvents` array and reports `events.length` for its in-view count.

GREEN - Messages count

Messages receives the same `calendarEvents` prop and reports `calendarEvents.length` in thread presence.

GREEN - Play continuity count

Play continues to render continuity feed derived from replay continuity records. Calendar imports also create continuity events, so Play reflects upload/hydration movement without inventing calendar rows.

YELLOW - Full persisted data migration

This pass aligns runtime hydration and client surfaces. It does not backfill old malformed artifacts or alter Supabase rows already persisted with unparseable calendar text.

## Result

All active ShowTELA surfaces now derive calendar truth from the same runtime state:

`durable artifacts + replay continuity events -> canonical calendarEvents -> view model -> surfaces`

If two screens disagree after this pass, that is a runtime bug, not a user interpretation problem.
