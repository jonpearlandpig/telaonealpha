import { execSync } from 'child_process'
import path from 'path'

const REPO_ROOT = path.resolve(process.cwd())

function run(cmd: string): string {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10_000 }).trim()
  } catch {
    return '(unavailable)'
  }
}

export type RepoContext = {
  branch: string
  status: string
  diffStat: string
  recentLog: string
  summary: string
}

export function gatherContext(): RepoContext {
  const branch = run('git rev-parse --abbrev-ref HEAD')
  const status = run('git status --short')
  const diffStat = run('git diff --stat HEAD')
  const recentLog = run('git log --oneline -5')

  const summary = [
    `Branch: ${branch}`,
    status ? `Modified:\n${status}` : 'Working tree clean',
    `Recent commits:\n${recentLog}`,
  ].join('\n')

  return { branch, status, diffStat, recentLog, summary }
}
