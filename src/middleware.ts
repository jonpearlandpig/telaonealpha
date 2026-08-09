import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from './lib/auth-session'
import {
  AUTH_POST_LOGIN_PATH,
  getAuthBaseUrl,
  SESSION_COOKIE_NAME,
} from './lib/auth-config'

export async function middleware(req: NextRequest) {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DISABLE_AUTH === 'true'
  ) {
    return NextResponse.next()
  }

  const session = req.cookies.get(SESSION_COOKIE_NAME)
  const isLoggedIn = Boolean(session?.value && (await verifySessionCookie(session.value)))
  const isOnSignIn = req.nextUrl.pathname.startsWith('/signin')
  const isOnShowtela = req.nextUrl.pathname.startsWith(AUTH_POST_LOGIN_PATH)
  const proofBypass = process.env.NODE_ENV !== 'production' && req.nextUrl.searchParams.get('showtela_proof') === '1'

  if (isOnShowtela && !isLoggedIn && !proofBypass) {
    return NextResponse.redirect(new URL('/signin', `${getAuthBaseUrl()}/`))
  }

  if (isOnSignIn && isLoggedIn) {
    return NextResponse.redirect(new URL(AUTH_POST_LOGIN_PATH, `${getAuthBaseUrl()}/`))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/showtela/:path*', '/signin'],
}
