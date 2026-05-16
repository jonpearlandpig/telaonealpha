import { NextResponse } from 'next/server'
import { isAllowedEmail } from '@/lib/auth/allowlist'

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return Response.redirect(new URL('/login?error=method', base))
}

export async function POST(req: Request) {
  console.log('LOGIN POST HIT')

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    return NextResponse.redirect(new URL('/login?error=malformed', req.url))
  }

  const form = await req.formData()
  const email = String(form.get('email') ?? '').trim().toLowerCase()

  if (!email) return NextResponse.redirect(new URL('/login?error=missing_email', req.url))
  if (!isAllowedEmail(email)) return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))

  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('showtela_user', email, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
  return res
}
