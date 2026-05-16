import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAllowedEmail } from '@/lib/auth/allowlist'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth/login') || pathname.startsWith('/login') || pathname.startsWith('/favicon')) return NextResponse.next()

  const email = req.cookies.get('showtela_user')?.value ?? ''
  if (!email || !isAllowedEmail(email)) return NextResponse.redirect(new URL('/login', req.url))

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] }
