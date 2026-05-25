export const AUTH_CALLBACK_PATH = '/api/auth/callback'
export const SESSION_COOKIE_NAME = 'showtela_session'

export function getAuthBaseUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL?.trim()
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL is required for Google OAuth redirects.')
  }
  return baseUrl.replace(/\/+$/, '')
}

export function getGoogleRedirectUri(): string {
  return `${getAuthBaseUrl()}${AUTH_CALLBACK_PATH}`
}

export function shouldUseSecureSessionCookie(): boolean {
  return getAuthBaseUrl().startsWith('https://')
}
