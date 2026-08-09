import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { GET as handleGoogleCallback } from '../app/api/auth/callback/route'
import { GET as handleGoogleStart } from '../app/api/auth/google/route'
import { POST as handleSignOut } from '../app/api/auth/signout/route'
import { middleware } from '../middleware'
import { getSignInErrorMessage } from './auth-errors'
import { createSessionCookie, verifySessionCookie, type ShowTelaUser } from './auth-session'
import {
  AUTH_CALLBACK_PATH,
  AUTH_GOOGLE_START_PATH,
  getAuthBaseUrl,
  getGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  getGoogleTokenRequestBody,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  shouldUseSecureSessionCookie,
} from './auth-config'

const AUTH_ENV_KEYS = [
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AUTH_SECRET',
  'NEXTAUTH_SECRET',
] as const

const LOCAL_ENV = {
  NEXTAUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  AUTH_SECRET: 'test-auth-secret-with-at-least-32-characters',
}

const TEST_USER: ShowTelaUser = {
  id: 'google-user-1',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.png',
}

async function withAuthEnv<T>(
  values: Partial<Record<(typeof AUTH_ENV_KEYS)[number], string | undefined>>,
  run: () => T | Promise<T>,
): Promise<T> {
  const originalValues = Object.fromEntries(
    AUTH_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof AUTH_ENV_KEYS)[number], string | undefined>

  for (const key of AUTH_ENV_KEYS) {
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }

  try {
    return await run()
  } finally {
    for (const key of AUTH_ENV_KEYS) {
      const originalValue = originalValues[key]
      if (originalValue === undefined) delete process.env[key]
      else process.env[key] = originalValue
    }
  }
}

function callbackRequest(
  origin: string,
  query: Record<string, string>,
  storedState?: string,
): NextRequest {
  const url = new URL(AUTH_CALLBACK_PATH, origin)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  const headers = storedState
    ? { cookie: `${OAUTH_STATE_COOKIE_NAME}=${encodeURIComponent(storedState)}` }
    : undefined
  return new NextRequest(url, { headers })
}

function getCookieValue(setCookie: string | null, name: string): string | undefined {
  return setCookie?.match(new RegExp(`(?:^|,\\s*)${name}=([^;,]*)`))?.[1]
}

async function withMockFetch<T>(
  mock: typeof globalThis.fetch,
  run: () => T | Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await run()
  } finally {
    globalThis.fetch = originalFetch
  }
}

function successfulGoogleFetch(requests: Array<{ url: string; init?: RequestInit }>) {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString()
    requests.push({ url, init })

    if (url === 'https://oauth2.googleapis.com/token') {
      return Response.json({ access_token: 'test-access-token' })
    }
    if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
      return Response.json({
        id: TEST_USER.id,
        name: TEST_USER.name,
        email: TEST_USER.email,
        picture: TEST_USER.image,
        verified_email: true,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }
}

test('builds exact local and production Google callbacks from configured origins', async () => {
  await withAuthEnv(LOCAL_ENV, () => {
    assert.equal(getAuthBaseUrl(), 'http://localhost:3000')
    assert.equal(getGoogleRedirectUri(), 'http://localhost:3000/api/auth/callback')
    assert.equal(shouldUseSecureSessionCookie(), false)
  })

  await withAuthEnv(
    { ...LOCAL_ENV, NEXTAUTH_URL: 'https://telaonealpha-jn9i.vercel.app' },
    () => {
      assert.equal(
        getGoogleRedirectUri(),
        'https://telaonealpha-jn9i.vercel.app/api/auth/callback',
      )
      assert.equal(shouldUseSecureSessionCookie(), true)
    },
  )
})

test('normalizes the legacy full callback value without duplicating its path', async () => {
  await withAuthEnv(
    {
      ...LOCAL_ENV,
      NEXTAUTH_URL: 'https://telaonealpha-jn9i.vercel.app/api/auth/callback',
    },
    () => {
      assert.equal(getAuthBaseUrl(), 'https://telaonealpha-jn9i.vercel.app')
      assert.equal(
        getGoogleRedirectUri(),
        'https://telaonealpha-jn9i.vercel.app/api/auth/callback',
      )
    },
  )
})

test('rejects unsafe or incomplete OAuth environment configuration', async () => {
  const urlWithCredentials = new URL('http://localhost:3000')
  urlWithCredentials.username = 'test-user'
  urlWithCredentials.password = 'test-password'
  const invalidBaseUrls = [
    '',
    'not-a-url',
    'ftp://localhost:3000',
    urlWithCredentials.toString(),
    'http://localhost:3000?redirect=elsewhere',
    'http://localhost:3000#fragment',
    'http://localhost:3000/not-auth',
  ]

  for (const NEXTAUTH_URL of invalidBaseUrls) {
    await withAuthEnv({ ...LOCAL_ENV, NEXTAUTH_URL }, () => {
      assert.throws(() => getAuthBaseUrl())
    })
  }

  await withAuthEnv({ ...LOCAL_ENV, GOOGLE_CLIENT_ID: '' }, () => {
    assert.throws(() => getGoogleAuthorizationUrl('state'), /GOOGLE_CLIENT_ID/)
  })
  await withAuthEnv(LOCAL_ENV, () => {
    assert.throws(() => getGoogleAuthorizationUrl('   '), /OAuth state/)
  })
  await withAuthEnv({ ...LOCAL_ENV, GOOGLE_CLIENT_SECRET: '', AUTH_SECRET: '' }, () => {
    assert.throws(() => getGoogleTokenRequestBody('code'), /GOOGLE_CLIENT_SECRET/)
  })
})

test('signed sessions use the NextAuth secret fallback and fail closed without one', async () => {
  await withAuthEnv(
    {
      ...LOCAL_ENV,
      AUTH_SECRET: '',
      NEXTAUTH_SECRET: 'test-nextauth-secret-with-at-least-32-characters',
    },
    async () => {
      const session = await createSessionCookie(TEST_USER)
      assert.deepEqual(await verifySessionCookie(session), TEST_USER)
    },
  )

  await withAuthEnv(
    {
      ...LOCAL_ENV,
      AUTH_SECRET: '',
      NEXTAUTH_SECRET: '',
    },
    async () => {
      await assert.rejects(() => createSessionCookie(TEST_USER), /signed sessions/)
      assert.equal(await verifySessionCookie('unsigned-session'), null)
    },
  )

  await withAuthEnv(
    { ...LOCAL_ENV, AUTH_SECRET: 'too-short', NEXTAUTH_SECRET: '' },
    async () => {
      await assert.rejects(() => createSessionCookie(TEST_USER), /at least 32/)
    },
  )
})

test('Google authorization and token requests share the canonical callback', async () => {
  await withAuthEnv(LOCAL_ENV, () => {
    const authorizationUrl = new URL(getGoogleAuthorizationUrl('oauth-state'))
    assert.equal(authorizationUrl.origin, 'https://accounts.google.com')
    assert.equal(authorizationUrl.pathname, '/o/oauth2/v2/auth')
    assert.equal(authorizationUrl.searchParams.get('client_id'), LOCAL_ENV.GOOGLE_CLIENT_ID)
    assert.equal(authorizationUrl.searchParams.get('redirect_uri'), getGoogleRedirectUri())
    assert.equal(authorizationUrl.searchParams.get('response_type'), 'code')
    assert.equal(authorizationUrl.searchParams.get('scope'), 'openid email profile')
    assert.equal(authorizationUrl.searchParams.get('access_type'), 'offline')
    assert.equal(authorizationUrl.searchParams.get('prompt'), 'select_account')
    assert.equal(authorizationUrl.searchParams.get('state'), 'oauth-state')

    const body = getGoogleTokenRequestBody('authorization-code')
    assert.equal(body.get('code'), 'authorization-code')
    assert.equal(body.get('client_id'), LOCAL_ENV.GOOGLE_CLIENT_ID)
    assert.equal(body.get('client_secret'), LOCAL_ENV.GOOGLE_CLIENT_SECRET)
    assert.equal(body.get('redirect_uri'), `http://localhost:3000${AUTH_CALLBACK_PATH}`)
    assert.equal(body.get('grant_type'), 'authorization_code')
  })
})

test('Google initiation creates one-time state and redirects with the exact callback', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    const response = await handleGoogleStart(
      new NextRequest('http://localhost:3000/api/auth/google'),
    )
    const location = new URL(response.headers.get('location') ?? '')
    const setCookie = response.headers.get('set-cookie')
    const cookieState = getCookieValue(setCookie, OAUTH_STATE_COOKIE_NAME)

    assert.equal(response.status, 307)
    assert.ok(cookieState)
    assert.equal(location.searchParams.get('state'), cookieState)
    assert.equal(location.searchParams.get('redirect_uri'), getGoogleRedirectUri())
    assert.match(setCookie ?? '', /HttpOnly/i)
    assert.match(setCookie ?? '', /SameSite=lax/i)
    assert.match(setCookie ?? '', new RegExp(`Path=${OAUTH_STATE_COOKIE_PATH}`, 'i'))
    assert.match(setCookie ?? '', /Max-Age=600/i)
    assert.doesNotMatch(setCookie ?? '', /; Secure/i)

    const aliasResponse = await handleGoogleStart(
      new NextRequest('https://alternate-deployment.vercel.app/api/auth/google'),
    )
    assert.equal(aliasResponse.headers.get('location'), 'http://localhost:3000/api/auth/google')
    assert.equal(aliasResponse.headers.get('set-cookie'), null)
  })
})

test('Google initiation preserves a bounded set of concurrent OAuth states', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    let cookieValue: string | undefined
    const issuedStates: string[] = []

    for (let index = 0; index < 4; index += 1) {
      const response = await handleGoogleStart(
        new NextRequest('http://localhost:3000/api/auth/google', {
          headers: cookieValue
            ? { cookie: `${OAUTH_STATE_COOKIE_NAME}=${encodeURIComponent(cookieValue)}` }
            : undefined,
        }),
      )
      issuedStates.push(new URL(response.headers.get('location') ?? '').searchParams.get('state') ?? '')
      cookieValue = decodeURIComponent(
        getCookieValue(response.headers.get('set-cookie'), OAUTH_STATE_COOKIE_NAME) ?? '',
      )
    }

    assert.deepEqual(cookieValue?.split('.'), issuedStates.slice(-3))

    const response = await handleGoogleCallback(
      callbackRequest(
        'http://localhost:3000',
        { error: 'access_denied', state: issuedStates[1] },
        cookieValue,
      ),
    )
    const remainingStates = decodeURIComponent(
      getCookieValue(response.headers.get('set-cookie'), OAUTH_STATE_COOKIE_NAME) ?? '',
    )
    assert.deepEqual(remainingStates.split('.'), issuedStates.slice(-2))
    assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=600/i)
  })
})

test('callback rejects missing, mismatched, denied, and missing-code states before exchange', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    let fetchCalls = 0
    await withMockFetch(async () => {
      fetchCalls += 1
      throw new Error('fetch should not run')
    }, async () => {
      const cases = [
        {
          request: callbackRequest('https://attacker.example', { code: 'code' }),
          error: 'invalid_state',
          remainingState: '',
        },
        {
          request: callbackRequest(
            'https://attacker.example',
            { code: 'code', state: 'returned' },
            'stored',
          ),
          error: 'invalid_state',
          remainingState: 'stored',
        },
        {
          request: callbackRequest(
            'https://attacker.example',
            { error: 'access_denied', state: 'state' },
            'state',
          ),
          error: 'oauth_denied',
          remainingState: '',
        },
        {
          request: callbackRequest(
            'https://attacker.example',
            { state: 'state' },
            'state',
          ),
          error: 'no_code',
          remainingState: '',
        },
      ]

      for (const { request, error, remainingState } of cases) {
        const response = await handleGoogleCallback(request)
        assert.equal(
          response.headers.get('location'),
          `http://localhost:3000/signin?error=${error}`,
        )
        assert.equal(
          decodeURIComponent(
            getCookieValue(response.headers.get('set-cookie'), OAUTH_STATE_COOKIE_NAME) ?? '',
          ),
          remainingState,
        )
        assert.match(
          response.headers.get('set-cookie') ?? '',
          new RegExp(`Path=${OAUTH_STATE_COOKIE_PATH}`, 'i'),
        )
      }
    })
    assert.equal(fetchCalls, 0)
  })
})

test('callback failure paths never create a session', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    const scenarios: Array<{
      error: string
      mock: typeof globalThis.fetch
    }> = [
      {
        error: 'token_exchange_failed',
        mock: async () => Response.json({ error: 'invalid_grant' }, { status: 400 }),
      },
      {
        error: 'token_exchange_failed',
        mock: async () => Response.json({ token_type: 'Bearer' }),
      },
      {
        error: 'userinfo_failed',
        mock: async (input) =>
          input.toString() === 'https://oauth2.googleapis.com/token'
            ? Response.json({ access_token: 'token' })
            : Response.json({ id: 'user-without-email' }),
      },
      {
        error: 'userinfo_failed',
        mock: async (input) =>
          input.toString() === 'https://oauth2.googleapis.com/token'
            ? Response.json({ access_token: 'token' })
            : Response.json({ error: 'upstream_failure' }, { status: 503 }),
      },
      {
        error: 'unverified_email',
        mock: async (input) =>
          input.toString() === 'https://oauth2.googleapis.com/token'
            ? Response.json({ access_token: 'token' })
            : Response.json({
                id: TEST_USER.id,
                name: TEST_USER.name,
                email: TEST_USER.email,
                verified_email: false,
              }),
      },
      {
        error: 'auth_failed',
        mock: async () => {
          throw new Error('network unavailable')
        },
      },
    ]

    const originalConsoleError = console.error
    console.error = () => undefined
    try {
      for (const scenario of scenarios) {
        await withMockFetch(scenario.mock, async () => {
          const response = await handleGoogleCallback(
            callbackRequest(
              'http://localhost:3000',
              { code: 'code', state: 'state' },
              'state',
            ),
          )
          assert.equal(
            response.headers.get('location'),
            `http://localhost:3000/signin?error=${scenario.error}`,
          )
          assert.equal(getCookieValue(response.headers.get('set-cookie'), SESSION_COOKIE_NAME), undefined)
        })
      }
    } finally {
      console.error = originalConsoleError
    }
  })
})

for (const { origin, secure } of [
  { origin: 'http://localhost:3000', secure: false },
  { origin: 'https://telaonealpha-jn9i.vercel.app', secure: true },
]) {
  test(`callback exchanges the code and creates a signed ${secure ? 'production' : 'local'} session`, async () => {
    await withAuthEnv({ ...LOCAL_ENV, NEXTAUTH_URL: origin }, async () => {
      const requests: Array<{ url: string; init?: RequestInit }> = []
      await withMockFetch(successfulGoogleFetch(requests), async () => {
        const response = await handleGoogleCallback(
          callbackRequest(origin, { code: 'authorization-code', state: 'state' }, 'state'),
        )

        assert.equal(response.status, 307)
        assert.equal(response.headers.get('location'), `${origin}/showtela`)
        assert.equal(requests.length, 2)

        const tokenBody = requests[0].init?.body
        assert.ok(tokenBody instanceof URLSearchParams)
        assert.equal(tokenBody.get('redirect_uri'), `${origin}${AUTH_CALLBACK_PATH}`)
        assert.equal(
          new Headers(requests[1].init?.headers).get('authorization'),
          'Bearer test-access-token',
        )
        assert.ok(requests[0].init?.signal instanceof AbortSignal)
        assert.ok(requests[1].init?.signal instanceof AbortSignal)

        const setCookie = response.headers.get('set-cookie')
        const encodedSession = getCookieValue(setCookie, SESSION_COOKIE_NAME)
        assert.ok(encodedSession)
        assert.match(setCookie ?? '', /HttpOnly/i)
        assert.match(setCookie ?? '', /SameSite=lax/i)
        assert.match(setCookie ?? '', new RegExp(`Max-Age=${SESSION_MAX_AGE_SECONDS}`))
        if (secure) assert.match(setCookie ?? '', /; Secure/i)
        else assert.doesNotMatch(setCookie ?? '', /; Secure/i)
        assert.match(setCookie ?? '', /showtela_oauth_state=;/)
        assert.match(setCookie ?? '', /showtela_oauth_state=[^,]*Max-Age=0/i)
        assert.match(
          setCookie ?? '',
          new RegExp(`showtela_oauth_state=[^,]*Path=${OAUTH_STATE_COOKIE_PATH}`, 'i'),
        )
        assert.deepEqual(await verifySessionCookie(encodedSession), TEST_USER)
      })
    })
  })
}

test('callback accepts a verified Google profile without a picture', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    await withMockFetch(async (input) => {
      if (input.toString() === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'token' })
      }
      return Response.json({
        id: TEST_USER.id,
        name: TEST_USER.name,
        email: TEST_USER.email,
        verified_email: true,
      })
    }, async () => {
      const response = await handleGoogleCallback(
        callbackRequest(
          'http://localhost:3000',
          { code: 'code', state: 'state' },
          'state',
        ),
      )
      const session = getCookieValue(response.headers.get('set-cookie'), SESSION_COOKIE_NAME)
      assert.ok(session)
      assert.deepEqual(await verifySessionCookie(session), { ...TEST_USER, image: '' })
    })
  })
})

test('signed sessions reject tampering, malformed values, and expiration', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    const originalNow = Date.now
    const issuedAt = Date.UTC(2026, 7, 9, 12, 0, 0)
    Date.now = () => issuedAt
    try {
      const session = await createSessionCookie(TEST_USER)
      assert.deepEqual(await verifySessionCookie(session), TEST_USER)

      const [payload, signature] = session.split('.')
      const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}`
      assert.equal(await verifySessionCookie(`${tamperedPayload}.${signature}`), null)
      assert.equal(await verifySessionCookie(`${payload}.${signature}extra`), null)
      assert.equal(await verifySessionCookie('unsigned-base64'), null)

      Date.now = () => issuedAt + (SESSION_MAX_AGE_SECONDS + 1) * 1000
      assert.equal(await verifySessionCookie(session), null)
    } finally {
      Date.now = originalNow
    }
  })
})

test('middleware accepts authentic sessions and rejects forged cookies', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    const authentic = await createSessionCookie(TEST_USER)
    const allowed = await middleware(
      new NextRequest('http://localhost:3000/showtela', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${authentic}` },
      }),
    )
    assert.equal(allowed.headers.get('x-middleware-next'), '1')

    const rejected = await middleware(
      new NextRequest('http://localhost:3000/showtela', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=forged` },
      }),
    )
    assert.equal(rejected.headers.get('location'), 'http://localhost:3000/signin')

    const redirectedFromSignIn = await middleware(
      new NextRequest('http://localhost:3000/signin', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${authentic}` },
      }),
    )
    assert.equal(
      redirectedFromSignIn.headers.get('location'),
      'http://localhost:3000/showtela',
    )

    const hostileHostRejected = await middleware(
      new NextRequest('https://attacker.example/showtela'),
    )
    assert.equal(
      hostileHostRejected.headers.get('location'),
      'http://localhost:3000/signin',
    )
  })
})

test('signout redirects to the configured origin and clears the session cookie', async () => {
  await withAuthEnv(LOCAL_ENV, async () => {
    const response = await handleSignOut(
      new NextRequest('https://attacker.example/api/auth/signout', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      }),
    )
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), 'http://localhost:3000/signin')
    assert.match(response.headers.get('set-cookie') ?? '', /showtela_session=;/)
    assert.match(response.headers.get('set-cookie') ?? '', /Expires=Thu, 01 Jan 1970/i)
    assert.match(response.headers.get('set-cookie') ?? '', /Path=\//i)

    const crossOriginResponse = await handleSignOut(
      new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: { origin: 'https://attacker.example' },
      }),
    )
    assert.equal(crossOriginResponse.status, 403)
    assert.equal(crossOriginResponse.headers.get('set-cookie'), null)
  })
})

test('sign-in route and callback error messages are stable', () => {
  assert.equal(AUTH_GOOGLE_START_PATH, '/api/auth/google')
  assert.match(getSignInErrorMessage('invalid_state') ?? '', /try again/i)
  assert.match(getSignInErrorMessage('unverified_email') ?? '', /verified email/i)
  assert.match(getSignInErrorMessage('unknown_error') ?? '', /could not be completed/i)
  assert.match(getSignInErrorMessage(['oauth_denied', 'invalid_state']) ?? '', /cancelled/i)
  assert.equal(getSignInErrorMessage(undefined), null)
})
