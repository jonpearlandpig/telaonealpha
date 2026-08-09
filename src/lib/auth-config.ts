export const AUTH_CALLBACK_PATH = '/api/auth/callback'
export const AUTH_GOOGLE_START_PATH = '/api/auth/google'
export const AUTH_POST_LOGIN_PATH = '/showtela'
export const OAUTH_STATE_COOKIE_NAME = 'showtela_oauth_state'
export const OAUTH_STATE_COOKIE_PATH = '/api/auth'
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60
export const OAUTH_STATE_MAX_PENDING = 3
export const SESSION_COOKIE_NAME = 'showtela_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
export const GOOGLE_REQUEST_TIMEOUT_MS = 10_000

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

function getRequiredEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required for Google OAuth.`)
  }
  return value
}

export function getAuthSessionSecret(): string {
  const value =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim()

  if (!value) {
    throw new Error(
      'AUTH_SECRET or NEXTAUTH_SECRET is required for signed sessions.',
    )
  }
  if (value.length < 32) {
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be at least 32 characters.')
  }
  return value
}

export function getAuthBaseUrl(): string {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim()
  if (!configuredUrl) {
    throw new Error('NEXTAUTH_URL is required for Google OAuth redirects.')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(configuredUrl)
  } catch {
    throw new Error('NEXTAUTH_URL must be an absolute http(s) application origin.')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('NEXTAUTH_URL must use http or https.')
  }
  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error('NEXTAUTH_URL must not contain credentials, a query, or a fragment.')
  }

  const configuredPath = parsedUrl.pathname.replace(/\/+$/, '') || '/'
  if (configuredPath !== '/' && configuredPath !== AUTH_CALLBACK_PATH) {
    throw new Error(
      `NEXTAUTH_URL must be an application origin, not a path. Received ${parsedUrl.pathname}.`,
    )
  }

  // Normalize the previously deployed full-callback value to its origin so an
  // existing misconfiguration cannot duplicate the callback path.
  return parsedUrl.origin
}

export function getGoogleRedirectUri(): string {
  return new URL(AUTH_CALLBACK_PATH, `${getAuthBaseUrl()}/`).toString()
}

export function getGoogleAuthorizationUrl(state: string): string {
  if (!state.trim()) throw new Error('OAuth state is required.')

  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  url.search = new URLSearchParams({
    client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  }).toString()
  return url.toString()
}

export function getGoogleTokenRequestBody(code: string): URLSearchParams {
  return new URLSearchParams({
    code,
    client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: getGoogleRedirectUri(),
    grant_type: 'authorization_code',
  })
}

export function parseOAuthStateCookie(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split('.')
    .map((state) => state.trim())
    .filter(Boolean)
    .slice(-OAUTH_STATE_MAX_PENDING)
}

export function serializeOAuthStateCookie(states: string[]): string {
  return states.slice(-OAUTH_STATE_MAX_PENDING).join('.')
}

export function shouldUseSecureSessionCookie(): boolean {
  return new URL(getAuthBaseUrl()).protocol === 'https:'
}
