import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('showtela_session')
  const isLoggedIn = !!session?.value
  const isOnSignIn = req.nextUrl.pathname.startsWith('/signin')
  const isOnShowtela = req.nextUrl.pathname.startsWith('/showtela')

  if (isOnShowtela && !isLoggedIn) {
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
