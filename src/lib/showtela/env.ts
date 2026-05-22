type DatabaseKey = 'people' | 'operations' | 'continuity' | 'unresolved' | 'artifacts' | 'inbox'

type DatabaseDefinition = {
  label: string
  requiredForLiveRuntime: boolean
  envKeys: string[]
}

export const SHOWTELA_DATABASES: Record<DatabaseKey, DatabaseDefinition> = {
  people: {
    label: 'People',
    requiredForLiveRuntime: true,
    envKeys: ['NOTION_SHOWTELA_PEOPLE_DB_ID', 'NOTION_CRUSADE_PEOPLE_DB_ID'],
  },
  operations: {
    label: 'Operations',
    requiredForLiveRuntime: true,
    envKeys: ['NOTION_SHOWTELA_OPERATIONS_DB_ID', 'NOTION_CRUSADE_OPERATIONS_DB_ID'],
  },
  continuity: {
    label: 'Continuity',
    requiredForLiveRuntime: true,
    envKeys: [
      'NOTION_SHOWTELA_CONTINUITY_DB_ID',
      'NOTION_CRUSADE_CONTINUITY_DB_ID',
      'NOTION_CRUSADE_EVENTS_DB_ID',
      'NOTION_SHOWTELA_EVENTS_DB_ID',
    ],
  },
  unresolved: {
    label: 'Unresolved',
    requiredForLiveRuntime: false,
    envKeys: ['NOTION_SHOWTELA_UNRESOLVED_DB_ID', 'NOTION_CRUSADE_UNRESOLVED_DB_ID'],
  },
  artifacts: {
    label: 'Artifacts',
    requiredForLiveRuntime: false,
    envKeys: ['NOTION_SHOWTELA_ARTIFACTS_DB_ID', 'NOTION_CRUSADE_ARTIFACTS_DB_ID'],
  },
  inbox: {
    label: 'Inbox',
    requiredForLiveRuntime: false,
    envKeys: ['NOTION_TELA_INBOX_DB_ID'],
  },
}

export const SHOWTELA_REQUIRED_ENV = [
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NOTION_API_KEY',
] as const

export const SHOWTELA_REQUIRED_DATABASE_KEYS: DatabaseKey[] = ['people', 'operations', 'continuity']

export function resolveShowTelaDatabase(key: DatabaseKey): { key: string; value: string | undefined } {
  for (const envKey of SHOWTELA_DATABASES[key].envKeys) {
    if (process.env[envKey]) return { key: envKey, value: process.env[envKey] }
  }
  return { key: SHOWTELA_DATABASES[key].envKeys[0], value: undefined }
}

export function isLikelyNotionDatabaseId(value: string | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{32}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function getShowTelaEnvStatus() {
  const databases = Object.entries(SHOWTELA_DATABASES).map(([key, definition]) => {
    const resolved = resolveShowTelaDatabase(key as DatabaseKey)
    return {
      key,
      label: definition.label,
      requiredForLiveRuntime: definition.requiredForLiveRuntime,
      envKey: resolved.key,
      configured: Boolean(resolved.value),
      invalidId: Boolean(resolved.value) && !isLikelyNotionDatabaseId(resolved.value),
      aliases: definition.envKeys,
    }
  })

  return {
    required: {
      NOTION_API_KEY: Boolean(process.env.NOTION_API_KEY),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    databases,
    missingRequired: [
      ...SHOWTELA_REQUIRED_ENV.filter((key) => !process.env[key]),
      ...databases
        .filter((db) => db.requiredForLiveRuntime && !db.configured)
        .map((db) => db.envKey),
    ],
    invalidDatabaseIds: databases
      .filter((db) => db.invalidId)
      .map((db) => db.envKey),
  }
}

export function assertShowTelaStartupEnv(scope: string): void {
  const status = getShowTelaEnvStatus()
  if (!status.missingRequired.length && !status.invalidDatabaseIds.length) return

  console.error('')
  console.error('============================================================')
  console.error(`[${scope}] ShowTELA live hydration is not configured`)
  if (status.missingRequired.length) {
    console.error('Missing required environment variables:')
    for (const key of status.missingRequired) console.error(`  - ${key}`)
  }
  if (status.invalidDatabaseIds.length) {
    console.error('Malformed Notion database IDs:')
    for (const key of status.invalidDatabaseIds) console.error(`  - ${key}`)
  }
  console.error('Required Notion databases:')
  for (const key of SHOWTELA_REQUIRED_DATABASE_KEYS) {
    const db = SHOWTELA_DATABASES[key]
    console.error(`  - ${db.label}: ${db.envKeys[0]}`)
  }
  console.error('============================================================')
  console.error('')
}

export function logShowTelaEnvStatus(scope: string): void {
  const status = getShowTelaEnvStatus()
  if (status.missingRequired.length) {
    console.warn(`[${scope}] missing required env vars:`, status.missingRequired)
  }
  if (status.invalidDatabaseIds.length) {
    console.error(`[${scope}] invalid Notion database id format:`, status.invalidDatabaseIds)
  }
}
