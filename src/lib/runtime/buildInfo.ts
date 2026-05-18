export type RuntimeBuildInfo = {
  commitSha: string
  branch: string
  buildTimestamp: string
  environment: string
}

function formatBuildTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

export function getRuntimeBuildInfo(): RuntimeBuildInfo {
  const commitSha = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7)
  const branch = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_REF ?? 'work'
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development'
  const buildTimestamp = formatBuildTimestamp(new Date().toISOString())
  return { commitSha, branch, buildTimestamp, environment }
}
