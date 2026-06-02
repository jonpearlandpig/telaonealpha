# Calendar Authority

## Canonical Source

`calendar_events` are canonical only when produced by:

`hydrateRuntime()` -> durable artifacts + replay events -> `buildShowTelaContinuityEvents()` -> `buildCanonicalCalendarEvents()` -> `ShowTelaViewModel.calendarEvents`

The authority module is:

`src/lib/showtela/calendarAuthority.ts`

## Rules

- Imported calendar rows are parsed from durable artifacts with `parseMarkdownCalendar()`.
- Runtime replay events provide continuity linkage and import timestamps.
- `CALENDAR_HYDRATED` is the preferred continuity event for an artifact.
- `CALENDAR_UPLOADED` is accepted when hydration linkage is not present.
- Client surfaces must not synthesize `calendar_events` from feed, unresolved items, operations, or timeline placeholders.
- Screens may derive display grouping from canonical events, but not independent event identity or counts.

## Consumers

- Home health count: `vm.showTelaHealth.calendarEvents`
- Home calendar rail: `CalendarWeekRail(events={vm.calendarEvents})`
- Calendar screen count and event list: `OperationalCalendar(events={vm.calendarEvents})`
- Messages thread presence: `TelaTalk(calendarEvents={vm.calendarEvents})`

## Non-Authority Data

- Continuity feed items remain continuity evidence, not calendar-event authority.
- Runtime timeline items remain replay history, not calendar-event authority.
- Unresolved items remain pressure state, not calendar-event authority.
- Operations remain organizational context, not calendar-event authority.
