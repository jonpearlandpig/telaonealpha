import { NextResponse } from 'next/server'

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'
  const buildTimestamp = process.env.VERCEL_GIT_COMMIT_SHA ? new Date().toISOString() : 'local-dev'

  return NextResponse.json(
    {
      commit,
      environment,
      buildTimestamp,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
