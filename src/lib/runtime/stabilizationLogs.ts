export type StabilizationLog = {
  at: string
  area: 'hydration' | 'retrieval' | 'env' | 'worker' | 'cache' | 'restoration'
  status: 'ok' | 'warn' | 'fail'
  message: string
}

const KEY = 'telaone_stabilization_logs_v1'

export function logStabilization(entry: Omit<StabilizationLog, 'at'>): void {
  if (typeof window === 'undefined') return
  const logs = loadStabilizationLogs()
  logs.unshift({ ...entry, at: new Date().toISOString() })
  window.localStorage.setItem(KEY, JSON.stringify(logs.slice(0, 200)))
}

export function loadStabilizationLogs(): StabilizationLog[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as StabilizationLog[] } catch { return [] }
}
