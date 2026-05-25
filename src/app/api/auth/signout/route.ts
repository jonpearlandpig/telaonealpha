import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-config'

export async function GET(req: Request) {
  const response = NextResponse.redirect(new URL('/signin', req.url))
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
