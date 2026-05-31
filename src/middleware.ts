import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from './lib/auth-config'

export function middleware(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE_NAME)
  const isLoggedIn = !!session?.value
  const isOnSignIn = req.nextUrl.pathname.startsWith('/signin')
  const isOnShowtela = req.nextUrl.pathname.startsWith('/showtela')
  const proofBypass = process.env.NODE_ENV !== 'production' && req.nextUrl.searchParams.get('showtela_proof') === '1'

  if (isOnShowtela && !isLoggedIn && !proofBypass) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }
  if (isOnSignIn && isLoggedIn) {
    return NextResponse.redirect(new URL('/showtela', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/showtela/:path*', '/signin'],
}
