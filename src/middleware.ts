import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAllowedEmail } from '@/lib/auth/allowlist'

export function middleware(request: NextRequest) {
  console.log('MIDDLEWARE PATH:', request.nextUrl.pathname)

  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next()
  }

  const email = request.cookies.get('showtela_user')?.value ?? ''
  if (!email || !isAllowedEmail(email)) return NextResponse.redirect(new URL('/login', request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth/).*)'],
}
