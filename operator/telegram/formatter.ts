import type { ExecutionResult, RuntimeProvider } from '../runtime/executor'

const ELAPSED = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function providerLabel(provider: RuntimeProvider): string {
  return provider === 'codex' ? 'Codex' : 'Claude Code'
}

export function formatWorking(mode: string, provider: RuntimeProvider): string {
  return `⏳ [${mode.toUpperCase()}] Executing...\nAnalyzing repo and running ${providerLabel(provider)}.`
}

export function formatResult(mode: string, result: ExecutionResult, provider: RuntimeProvider): string {
  const lines: string[] = []

  if (result.error) {
    lines.push(`❌ [${mode.toUpperCase()}] ${providerLabel(provider)} failed`)
    lines.push(`Error: ${result.error}`)
    return lines.join('\n')
  }

  if (result.timedOut) {
    lines.push(`⏱ [${mode.toUpperCase()}] ${providerLabel(provider)} timed out after 5 minutes`)
    return lines.join('\n')
  }

  const buildIcon = result.buildStatus === 'passed' ? '✓' : result.buildStatus === 'failed' ? '✗' : '?'
  lines.push(`✅ [${mode.toUpperCase()}] ${providerLabel(provider)} complete (${ELAPSED(result.elapsedMs)}) — Build ${buildIcon}`)

  if (result.changedFiles.length) {
    lines.push(`\nChanged files:`)
    result.changedFiles.slice(0, 10).forEach(f => lines.push(`  • ${f}`))
    if (result.changedFiles.length > 10) lines.push(`  …+${result.changedFiles.length - 10} more`)
  }

  if (result.commitHash) {
    lines.push(`\nCommit: ${result.commitHash}`)
  }

  if (result.approvalBlocks.length > 0) {
    lines.push(`\n⚠️ Approval blocks (${result.approvalBlocks.length}):`)
    result.approvalBlocks.slice(0, 3).forEach(b => {
      lines.push(`  blocked: ${b.blockedCommand}`)
      lines.push(`  fix: ${b.suggestedAction}`)
    })
  }

  const summary = extractSummary(result.output)
  if (summary) {
    lines.push(`\n${summary}`)
  }

  return lines.join('\n')
}

export function formatStatus(context: { branch: string; status: string; recentLog: string }): string {
  return [
    `📡 TELA Operator — Active`,
    `Branch: ${context.branch}`,
    context.status ? `Modified:\n${context.status}` : `Working tree clean`,
    `\nRecent:\n${context.recentLog}`,
  ].join('\n')
}

export function formatError(msg: string): string {
  return `⚠️ ${msg}`
}

function extractSummary(output: string): string {
  if (!output) return ''
  const lines = output.split('\n').filter(l => l.trim())
  const last = lines.slice(-6).join('\n')
  return last.length > 600 ? last.slice(-600) : last
}
