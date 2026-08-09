import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/auth-session'
import {
  AUTH_POST_LOGIN_PATH,
  getAuthBaseUrl,
  getGoogleTokenRequestBody,
  GOOGLE_REQUEST_TIMEOUT_MS,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_MAX_AGE_SECONDS,
  parseOAuthStateCookie,
  serializeOAuthStateCookie,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  shouldUseSecureSessionCookie,
} from '@/lib/auth-config'

type GoogleTokenResponse = {
  access_token?: string
  error?: string
}

type GoogleUserResponse = {
  id?: string
  name?: string
  email?: string
  picture?: string
  verified_email?: boolean
}

function redirectToSignIn(error: string, pendingStates: string[]): NextResponse {
  const url = new URL('/signin', getAuthBaseUrl())
  url.searchParams.set('error', error)
  const response = NextResponse.redirect(url)
  setOAuthStateCookie(response, pendingStates)
  return response
}

function setOAuthStateCookie(response: NextResponse, pendingStates: string[]): void {
  response.cookies.set(
    OAUTH_STATE_COOKIE_NAME,
    serializeOAuthStateCookie(pendingStates),
    {
      httpOnly: true,
      secure: shouldUseSecureSessionCookie(),
      sameSite: 'lax',
      maxAge: pendingStates.length > 0 ? OAUTH_STATE_MAX_AGE_SECONDS : 0,
      path: OAUTH_STATE_COOKIE_PATH,
    },
  )
}

export async function GET(req: NextRequest) {
  const returnedState = req.nextUrl.searchParams.get('state')
  const pendingStates = parseOAuthStateCookie(
    req.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value,
  )
  if (!returnedState || !pendingStates.includes(returnedState)) {
    return redirectToSignIn('invalid_state', pendingStates)
  }
  const remainingStates = pendingStates.filter((state) => state !== returnedState)

  if (req.nextUrl.searchParams.has('error')) {
    return redirectToSignIn('oauth_denied', remainingStates)
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return redirectToSignIn('no_code', remainingStates)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: getGoogleTokenRequestBody(code),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    })

    const tokens = (await tokenRes.json()) as GoogleTokenResponse
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Google token exchange failed:', {
        status: tokenRes.status,
        error: tokens.error ?? 'missing_access_token',
      })
      return redirectToSignIn('token_exchange_failed', remainingStates)
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    })
    const user = (await userRes.json()) as GoogleUserResponse
    if (!userRes.ok || !user.id || !user.name || !user.email) {
      console.error('Google userinfo request failed:', { status: userRes.status })
      return redirectToSignIn('userinfo_failed', remainingStates)
    }

    if (user.verified_email !== true) {
      return redirectToSignIn('unverified_email', remainingStates)
    }

    const session = await createSessionCookie({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.picture ?? '',
    })

    const response = NextResponse.redirect(new URL(AUTH_POST_LOGIN_PATH, getAuthBaseUrl()))
    setOAuthStateCookie(response, remainingStates)
    response.cookies.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: shouldUseSecureSessionCookie(),
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })
    return response
  } catch (e) {
    console.error('Auth error:', e)
    return redirectToSignIn('auth_failed', remainingStates)
  }
}
