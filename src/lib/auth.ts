import { cookies } from 'next/headers'
import { verifySessionCookie } from './auth-session'
import { SESSION_COOKIE_NAME } from './auth-config'

export {
  createSessionCookie,
  verifySessionCookie,
} from './auth-session'
export type { ShowTelaUser } from './auth-session'
export { SESSION_COOKIE_NAME } from './auth-config'

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)
  if (!session?.value) return null
  return verifySessionCookie(session.value)
}
