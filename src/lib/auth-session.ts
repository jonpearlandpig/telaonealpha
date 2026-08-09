import {
  getAuthSessionSecret,
  SESSION_MAX_AGE_SECONDS,
} from './auth-config'

export interface ShowTelaUser {
  id: string
  name: string
  email: string
  image: string
}

const textEncoder = new TextEncoder()
const SESSION_TOKEN_ISSUER = 'showtela'
const SESSION_TOKEN_AUDIENCE = 'showtela-app'

type SessionPayload = {
  iss: typeof SESSION_TOKEN_ISSUER
  aud: typeof SESSION_TOKEN_AUDIENCE
  iat: number
  exp: number
  user: ShowTelaUser
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(textEncoder.encode(value))
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function base64UrlToString(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value))
}

let signingKeyCache: { secret: string; key: Promise<CryptoKey> } | undefined

function getSessionSigningKey(): Promise<CryptoKey> {
  const secret = getAuthSessionSecret()
  if (signingKeyCache?.secret === secret) return signingKeyCache.key

  const key = crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  signingKeyCache = { secret, key }
  return key
}

function isShowTelaUser(value: unknown): value is ShowTelaUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<ShowTelaUser>
  return (
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    typeof user.name === 'string' &&
    user.name.length > 0 &&
    typeof user.email === 'string' &&
    user.email.length > 0 &&
    typeof user.image === 'string'
  )
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<SessionPayload>
  const now = Math.floor(Date.now() / 1000)
  return (
    payload.iss === SESSION_TOKEN_ISSUER &&
    payload.aud === SESSION_TOKEN_AUDIENCE &&
    typeof payload.iat === 'number' &&
    payload.iat <= now &&
    typeof payload.exp === 'number' &&
    payload.exp > now &&
    isShowTelaUser(payload.user)
  )
}

export async function verifySessionCookie(value: string): Promise<ShowTelaUser | null> {
  try {
    const [payload, signature, extra] = value.split('.')
    if (!payload || !signature || extra !== undefined) return null

    const validSignature = await crypto.subtle.verify(
      'HMAC',
      await getSessionSigningKey(),
      base64UrlToBytes(signature),
      textEncoder.encode(payload),
    )
    if (!validSignature) return null

    const sessionPayload: unknown = JSON.parse(base64UrlToString(payload))
    return isSessionPayload(sessionPayload) ? sessionPayload.user : null
  } catch {
    return null
  }
}

export async function createSessionCookie(user: ShowTelaUser): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = stringToBase64Url(
    JSON.stringify({
      iss: SESSION_TOKEN_ISSUER,
      aud: SESSION_TOKEN_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + SESSION_MAX_AGE_SECONDS,
      user,
    } satisfies SessionPayload),
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    await getSessionSigningKey(),
    textEncoder.encode(payload),
  )
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`
}
