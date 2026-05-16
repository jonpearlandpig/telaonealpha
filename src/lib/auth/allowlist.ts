export const SHOWTELA_ALLOWLIST = [
  'jon@crusade.show',
  'juan@crusade.show',
  'mags@crusade.show',
] as const

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return SHOWTELA_ALLOWLIST.includes(normalized as (typeof SHOWTELA_ALLOWLIST)[number])
}
