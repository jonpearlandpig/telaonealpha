import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_GOOGLE_START_PATH,
  getAuthBaseUrl,
  getGoogleAuthorizationUrl,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_MAX_AGE_SECONDS,
  OAUTH_STATE_MAX_PENDING,
  parseOAuthStateCookie,
  serializeOAuthStateCookie,
  shouldUseSecureSessionCookie,
} from '@/lib/auth-config'

export async function GET(req: NextRequest) {
  const canonicalStartUrl = new URL(AUTH_GOOGLE_START_PATH, `${getAuthBaseUrl()}/`)
  if (req.nextUrl.origin !== canonicalStartUrl.origin) {
    return NextResponse.redirect(canonicalStartUrl)
  }

  const state = crypto.randomUUID()
  const pendingStates = parseOAuthStateCookie(
    req.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value,
  )
  const nextStates = [...pendingStates, state].slice(-OAUTH_STATE_MAX_PENDING)
  const response = NextResponse.redirect(getGoogleAuthorizationUrl(state))
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, serializeOAuthStateCookie(nextStates), {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: OAUTH_STATE_COOKIE_PATH,
  })
  return response
}
