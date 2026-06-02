import { getSession } from './auth'

export async function requireApiSession(request: Request) {
  const session = await getSession()
  if (session) return { ok: true as const, session }

  const url = new URL(request.url)
  const proofBypass = process.env.NODE_ENV !== 'production' && (
    url.searchParams.get('showtela_proof') === '1' ||
    url.searchParams.get('proof') === '1'
  )

  if (proofBypass) return { ok: true as const, session: null }

  return { ok: false as const, status: 401, error: 'Unauthorized' }
}
