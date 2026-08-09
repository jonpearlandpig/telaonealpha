import { NextRequest, NextResponse } from 'next/server'
import { getAuthBaseUrl, SESSION_COOKIE_NAME } from '@/lib/auth-config'

export async function POST(req: NextRequest) {
  const baseUrl = getAuthBaseUrl()
  if (req.headers.get('origin') !== new URL(baseUrl).origin) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 })
  }

  const response = NextResponse.redirect(new URL('/signin', `${baseUrl}/`), 303)
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
