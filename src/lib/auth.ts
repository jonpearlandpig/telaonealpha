import { cookies } from 'next/headers'

export interface ShowTelaUser {
  id: string
  name: string
  email: string
  image: string
}

export async function getSession(): Promise<ShowTelaUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('showtela_session')
  if (!session?.value) return null
  try {
    return JSON.parse(Buffer.from(session.value, 'base64').toString())
  } catch {
    return null
  }
}

export function createSessionCookie(user: ShowTelaUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}
