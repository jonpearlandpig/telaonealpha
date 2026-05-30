export const ACTIONS = {
  INGEST_CONTINUITY: 'ingest.continuity',
  SCHEDULE_MEETING: 'schedule.meeting',
  UPDATE_ENTITY: 'update.entity',
  CREATE_UNRESOLVED: 'create.unresolved',
  PROMOTE_INBOX: 'promote.inbox',
  CONFIRM_STAFFING: 'confirm.staffing',
  INITIATE_VENUE_BRIEF: 'initiate.venue-brief',
  GENERATE_CALL_SHEET: 'generate.call-sheet',
  ACTIVATE_FLUENCY_PARTNER: 'activate.fluency-partner',
  RESOLVE_UNRESOLVED: 'resolve.unresolved',
  EXECUTE_OPERATIONAL_ACTION: 'execute.operational-action',
  GENERATE_REPORT: 'generate.report',
  ARCHIVE_CONTINUITY: 'archive.continuity',
} as const

export const AUTHORITY_RANK = {
  S0: 0,
  S1: 1,
  S2: 2,
  S3: 3,
  S4: 4,
} as const

export type RuntimeAction = typeof ACTIONS[keyof typeof ACTIONS]
export type AuthorityLevel = keyof typeof AUTHORITY_RANK
