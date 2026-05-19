import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnSignIn = req.nextUrl.pathname.startsWith('/signin')
  const isOnShowtela = req.nextUrl.pathname.startsWith('/showtela')

  if (isOnShowtela && !isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  if (isOnSignIn && isLoggedIn) {
    return NextResponse.redirect(new URL('/showtela', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/showtela/:path*', '/signin'],
}
