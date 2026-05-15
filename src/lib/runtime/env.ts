export type RuntimeEnvStatus = {
  requiredMissing: string[]
  optionalMissing: string[]
  ok: boolean
}

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const
const OPTIONAL = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'NOTION_API_KEY'] as const

export function readRuntimeEnv(): RuntimeEnvStatus {
  const requiredMissing = REQUIRED.filter((k) => !process.env[k])
  const optionalMissing = OPTIONAL.filter((k) => !process.env[k])
  return { requiredMissing: [...requiredMissing], optionalMissing: [...optionalMissing], ok: requiredMissing.length === 0 }
}

export function assertServerEnv(): RuntimeEnvStatus {
  return readRuntimeEnv()
}
