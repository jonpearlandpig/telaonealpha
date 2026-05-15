export type ValidationLog = {
  at: string
  reason: string
  trigger: string
  topRankedIds: string[]
  unresolvedInfluence: number
  canonicalOverrides: string[]
  semanticContribution: number
  restorationSource: string
  hydrationMs: number
}

const STORAGE_KEY = 'telaone_validation_logs_v1'

export function loadValidationLogs(): ValidationLog[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as ValidationLog[] } catch { return [] }
}

export function appendValidationLog(log: ValidationLog): ValidationLog[] {
  const logs = loadValidationLogs()
  const next = [log, ...logs].slice(0, 200)
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function summarizeValidationLogs(logs: ValidationLog[]): string {
  if (!logs.length) return 'No validation logs yet.'
  const avgHydration = logs.reduce((s, l) => s + l.hydrationMs, 0) / logs.length
  const unresolvedAvg = logs.reduce((s, l) => s + l.unresolvedInfluence, 0) / logs.length
  return `Logs: ${logs.length}. Avg hydration ${avgHydration.toFixed(1)}ms. Avg unresolved influence ${unresolvedAvg.toFixed(1)}.`
}
