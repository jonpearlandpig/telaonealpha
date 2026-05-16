import { NextResponse } from 'next/server'
import { isAllowedEmail } from '@/lib/auth/allowlist'

export async function POST(req: Request) {
  const form = await req.formData()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  if (!isAllowedEmail(email)) return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))

  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('showtela_user', email, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
  return res
}
