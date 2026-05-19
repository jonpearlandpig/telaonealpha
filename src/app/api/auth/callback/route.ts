import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/signin?error=no_code', req.url))

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokens.access_token) return NextResponse.redirect(new URL('/signin?error=no_token', req.url))

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const user = await userRes.json() as { id: string; name: string; email: string; picture: string }

    const session = createSessionCookie({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.picture,
    })

    const response = NextResponse.redirect(new URL('/showtela', req.url))
    response.cookies.set('showtela_session', session, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  } catch (e) {
    console.error('Auth error:', e)
    return NextResponse.redirect(new URL('/signin?error=auth_failed', req.url))
  }
}
