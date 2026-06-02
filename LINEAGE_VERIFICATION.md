# Lineage Verification

## Scope

Verification anchors:

- Anchor Directory: `proof/crusade-june1-anchor.md`
- Tour Calendar: `proof/crusade-june1-calendar.md`
- Production Rider: `proof/crusade-june1-rider.md`

Parser verification was run against the current code:

| Artifact | Parser result |
|---|---|
| Anchor Directory | 18 people, 6 directory departments |
| Tour Calendar | 32 calendar events, 5 calendar departments |
| Production Rider | 6 rider departments, 18 rider requirements |

## Trace 1: Anchor Directory

| Step | Evidence |
|---|---|
| Artifact | `proof/crusade-june1-anchor.md` |
| Continuity event | `ANCHOR_UPLOADED`, then `PEOPLE_HYDRATED` |
| Entity | People including Jon Hartman, Kay Jing, Sam Rivers, Miles Okada, Marcus Stone |
| Operation | Directory departments including ShowTELA Operations, Creative Direction, Executive and Tour Leadership |
| Calendar impact | Calendar owners from the Tour Calendar can resolve to people introduced by the Anchor Directory, turning owner names into accountable entities |

Answerable questions:

| Question | Answer |
|---|---|
| Where did this come from? | Anchor Directory artifact |
| Why does it exist? | It introduced the canonical contact roster |
| What created it? | Directory parser during `PEOPLE_HYDRATED` |
| When did it enter continuity? | `PEOPLE_HYDRATED.created_at` |
| Who introduced it? | `PEOPLE_HYDRATED.created_by` |

## Trace 2: Tour Calendar

| Step | Evidence |
|---|---|
| Artifact | `proof/crusade-june1-calendar.md` |
| Continuity event | `CALENDAR_UPLOADED`, then `CALENDAR_HYDRATED` |
| Entity | Runtime owners named on ShowTELA operational events: Sam Rivers, Miles Okada, Marcus Stone, Kay Jing, Jon Hartman |
| Operation | Music Rehearsals, Production Rehearsals, Spring 2027 Tour Routing, ShowTELA Operational Events |
| Calendar impact | 32 canonical calendar events become `ShowTelaViewModel.calendarEvents` and drive the Home rail, Calendar screen, Messages presence, and health count |

Answerable questions:

| Question | Answer |
|---|---|
| Where did this come from? | Tour Calendar artifact |
| Why does it exist? | It supplied dated tour, rehearsal, routing, and operational events |
| What created it? | Calendar parser during `CALENDAR_HYDRATED` |
| When did it enter continuity? | `CALENDAR_HYDRATED.created_at` |
| Who introduced it? | `CALENDAR_HYDRATED.created_by` |

## Trace 3: Production Rider

| Step | Evidence |
|---|---|
| Artifact | `proof/crusade-june1-rider.md` |
| Continuity event | `RIDER_UPLOADED`, then `OPERATIONS_HYDRATED` |
| Entity | Requirement owners are role-based until reconciled to people; examples include FOH Engineer, Lighting Director, Stage Manager, Transportation Captain, Head of Security |
| Operation | Audio, Lighting, Video, Stage Management, Transportation, Security |
| Calendar impact | Rider departments and requirements add pressure context to calendar dates, especially production rehearsal and venue routing days |

Answerable questions:

| Question | Answer |
|---|---|
| Where did this come from? | Production Rider artifact |
| Why does it exist? | It supplied production departments and requirements |
| What created it? | Rider parser during `OPERATIONS_HYDRATED` |
| When did it enter continuity? | `OPERATIONS_HYDRATED.created_at` |
| Who introduced it? | `OPERATIONS_HYDRATED.created_by` |

## Verification Result

Lineage can now be explained across the runtime as:

`Artifact -> Continuity Event -> Entity -> Operation -> Calendar Impact`

The current gap is UI completion: Calendar already carries partial lineage fields, while people, operation, and artifact click surfaces should attach the unified `ShowTelaLineageObject` from `LINEAGE_MODEL.md`.
