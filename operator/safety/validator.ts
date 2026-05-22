const ALLOWED_USER_IDS = (process.env.TELEGRAM_ALLOWED_USER_ID ?? '')
  .split(',')
  .map(s => parseInt(s.trim(), 10))
  .filter(n => !isNaN(n))

const APPROVAL_REQUIRED_PATTERNS = [
  /force.?push/i,
  /git push.*--force/i,
  /rm\s+-rf/i,
  /drop\s+table/i,
  /delete.*migration/i,
  /middleware/i,
  /auth.*change/i,
  /production.*deploy/i,
]

const FORBIDDEN_PATTERNS = [
  /process\.env/i,
  /\.env/i,
  /secret/i,
  /credential/i,
  /api_key/i,
  /password/i,
  /\brm\b/i,
  /\bsudo\b/i,
  /\breboot\b/i,
  /\bshutdown\b/i,
  /git\s+reset\s+.*--hard/i,
]

export function isAllowedSender(userId: number): boolean {
  if (ALLOWED_USER_IDS.length === 0) {
    console.warn('[safety] TELEGRAM_ALLOWED_USER_ID not set — rejecting all senders')
    return false
  }
  return ALLOWED_USER_IDS.includes(userId)
}

export function requiresApproval(instruction: string): string | null {
  for (const pattern of APPROVAL_REQUIRED_PATTERNS) {
    if (pattern.test(instruction)) return `Requires approval: matched pattern "${pattern.source}"`
  }
  return null
}

export function isForbidden(instruction: string): string | null {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(instruction)) return `Forbidden: matched pattern "${pattern.source}"`
  }
  return null
}
