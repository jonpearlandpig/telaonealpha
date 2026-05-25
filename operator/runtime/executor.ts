import { execSync } from 'child_process'
import fs from 'fs'
import type { RepoContext } from './contextGatherer'

const REPO_ROOT = process.cwd()
const TIMEOUT_MS = 5 * 60 * 1000
const POLL_MS = 500

export type BuildStatus = 'passed' | 'failed' | 'unknown'
export type RuntimeProvider = 'claude-code' | 'codex'

export type ApprovalBlock = {
  blockedCommand: string
  approvalReason: string
  canResume: boolean
  suggestedAction: string
}

export type ExecutionResult = {
  output: string
  changedFiles: string[]
  commitHash: string | null
  buildStatus: BuildStatus
  approvalBlocks: ApprovalBlock[]
  elapsedMs: number
  timedOut: boolean
  error: string | null
}

const BUILD_PASS_RE = /✓ compiled successfully|build passed|compiled successfully|generating static pages/i
const BUILD_FAIL_RE = /failed to compile|build failed|error ts\d+|type error:/i
const APPROVAL_BLOCK_RE = /requires approval|permission denied|not allowed|cannot run bash|blocked by|needs approval/i
const APPROVAL_COMMAND_RE = /`([^`]+)`|"([^"]+)"|'([^']+)'/
const PROVIDER_LABEL: Record<RuntimeProvider, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
}

function parseBuildStatus(output: string): BuildStatus {
  if (BUILD_PASS_RE.test(output)) return 'passed'
  if (BUILD_FAIL_RE.test(output)) return 'failed'
  return 'unknown'
}

function parseApprovalBlocks(output: string): ApprovalBlock[] {
  const blocks: ApprovalBlock[] = []
  const lines = output.split('\n')
  for (const line of lines) {
    if (!APPROVAL_BLOCK_RE.test(line)) continue
    const commandMatch = line.match(APPROVAL_COMMAND_RE)
    const blockedCommand = commandMatch?.[1] ?? commandMatch?.[2] ?? commandMatch?.[3] ?? '(unknown command)'
    blocks.push({
      blockedCommand,
      approvalReason: line.trim().slice(0, 200),
      canResume: true,
      suggestedAction: `Review and approve the blocked ${blockedCommand} action, then retry.`,
    })
  }
  return blocks
}

function getChangedFiles(): string[] {
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 5000 }).trim()
    return out ? out.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

function getLastCommit(): string | null {
  try {
    return execSync('git log --oneline -1', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 5000 }).trim() || null
  } catch {
    return null
  }
}

function hasCodeChanges(files: string[]): boolean {
  return files.some(f => /\.(ts|tsx|js|jsx|mts|mjs|css)$/.test(f))
}

function runBuildCheck(): BuildStatus {
  try {
    execSync('npm run build', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120_000, stdio: 'pipe' })
    return 'passed'
  } catch (err) {
    const out = (err as { stdout?: string; stderr?: string })
    const combined = (out.stdout ?? '') + (out.stderr ?? '')
    if (BUILD_FAIL_RE.test(combined)) return 'failed'
    return 'failed'
  }
}

function buildPrompt(instruction: string, context: RepoContext, mode: string, provider: RuntimeProvider): string {
  return `# TELA Operator Relay — ${mode.toUpperCase()} instruction

## Runtime Provider
${provider}

## Repo Context
${context.summary}

## Instruction
${instruction}

## Execution Rules
- Work only in this repo directory
- Do not expose env vars or credentials
- Do not force push
- Run npm run build to verify changes before committing
- Report build pass/fail explicitly in your final response
- Keep changes minimal and targeted
- If npm run build fails, fix errors before committing
`
}

// Runs the provider CLI inside a named tmux session.
// Prompt is passed via a Node.js wrapper script to avoid all shell quoting issues.
// Output is captured to a temp file; completion is signaled by a sentinel string.
async function runInTmux(provider: RuntimeProvider, prompt: string): Promise<{
  output: string
  timedOut: boolean
  error: string | null
}> {
  const sessionName = provider === 'codex' ? 'codex' : 'claude'
  const ts = Date.now()
  const promptFile = `/tmp/tela-prompt-${ts}`
  const outFile = `/tmp/tela-out-${ts}`
  const wrapFile = `/tmp/tela-wrap-${ts}.cjs`
  const runFile = `/tmp/tela-run-${ts}.sh`
  const sentinel = `__TELA_DONE_${ts}__`

  try {
    fs.writeFileSync(promptFile, prompt, { encoding: 'utf8', mode: 0o600 })
  } catch (e) {
    return { output: '', timedOut: false, error: `prompt write: ${String(e)}` }
  }

  // Node.js wrapper — passes prompt as a direct argv element, no shell quoting involved.
  const wrapContent = provider === 'codex'
    ? [
        `'use strict'`,
        `const {readFileSync}=require('fs'),{spawnSync}=require('child_process');`,
        `const p=readFileSync(${JSON.stringify(promptFile)},'utf8');`,
        `const r=spawnSync('codex',['exec','--cd',${JSON.stringify(REPO_ROOT)},'--sandbox','workspace-write','--ask-for-approval','never','--color','never','-'],`,
        `  {cwd:${JSON.stringify(REPO_ROOT)},input:p,stdio:['pipe','inherit','inherit'],env:{...process.env,FORCE_COLOR:'0',NO_COLOR:'1'}});`,
        `process.exit(r.status??0);`,
      ].join('\n')
    : [
        `'use strict'`,
        `const {readFileSync}=require('fs'),{spawnSync}=require('child_process');`,
        `const p=readFileSync(${JSON.stringify(promptFile)},'utf8');`,
        `const r=spawnSync('claude',['-p',p,'--dangerously-skip-permissions'],`,
        `  {cwd:${JSON.stringify(REPO_ROOT)},stdio:['ignore','inherit','inherit'],env:{...process.env,FORCE_COLOR:'0',NO_COLOR:'1'}});`,
        `process.exit(r.status??0);`,
      ].join('\n')

  // Shell runner — executed by tmux; routes output to temp file; writes sentinel on completion.
  const runContent = [
    `#!/bin/sh`,
    `node '${wrapFile}' > '${outFile}' 2>&1`,
    `echo '${sentinel}' >> '${outFile}'`,
    `rm -f '${wrapFile}' '${promptFile}'`,
  ].join('\n') + '\n'

  try {
    fs.writeFileSync(wrapFile, wrapContent, { encoding: 'utf8', mode: 0o600 })
    fs.writeFileSync(runFile, runContent, { encoding: 'utf8', mode: 0o700 })
  } catch (e) {
    return { output: '', timedOut: false, error: `script write: ${String(e)}` }
  }

  // Kill any existing session for this provider before starting a new one.
  try { execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: 'ignore' }) } catch {}

  try {
    execSync(`tmux new-session -d -s ${sessionName} sh '${runFile}'`)
    console.log(`[executor] ${PROVIDER_LABEL[provider]} running in tmux session '${sessionName}'`)
  } catch (e) {
    try { fs.unlinkSync(wrapFile) } catch {}
    try { fs.unlinkSync(runFile) } catch {}
    try { fs.unlinkSync(promptFile) } catch {}
    return { output: '', timedOut: false, error: `tmux start: ${String(e)}` }
  }

  // Poll output file until sentinel appears or timeout is reached.
  const pollStart = Date.now()
  while (Date.now() - pollStart < TIMEOUT_MS) {
    await new Promise<void>(r => setTimeout(r, POLL_MS))
    try {
      const content = fs.readFileSync(outFile, 'utf8')
      if (content.includes(sentinel)) {
        try { fs.unlinkSync(outFile) } catch {}
        try { fs.unlinkSync(runFile) } catch {}
        return { output: content.slice(0, content.indexOf(sentinel)).trim(), timedOut: false, error: null }
      }
    } catch { /* outFile not yet written */ }
  }

  // Timeout — kill session and any orphaned grandchild processes by wrap-file name.
  try { execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: 'ignore' }) } catch {}
  try { execSync(`pkill -f 'tela-wrap-${ts}' 2>/dev/null`, { stdio: 'ignore' }) } catch {}
  try { execSync(`pkill -f 'tela-run-${ts}' 2>/dev/null`, { stdio: 'ignore' }) } catch {}
  try { fs.unlinkSync(outFile) } catch {}
  try { fs.unlinkSync(runFile) } catch {}
  try { fs.unlinkSync(promptFile) } catch {}
  return { output: '', timedOut: true, error: null }
}

export function cancelActiveExecution(): void {
  try { execSync('tmux kill-session -t claude 2>/dev/null', { stdio: 'ignore' }) } catch {}
  try { execSync('tmux kill-session -t codex 2>/dev/null', { stdio: 'ignore' }) } catch {}
  try { execSync("pkill -f 'tela-wrap-' 2>/dev/null", { stdio: 'ignore' }) } catch {}
  try { execSync("pkill -f 'tela-run-' 2>/dev/null", { stdio: 'ignore' }) } catch {}
  console.log('[executor] active execution cancelled')
}

export async function executeInstruction(
  instruction: string,
  context: RepoContext,
  mode: string,
  provider: RuntimeProvider = 'claude-code',
  onProgress?: (chunk: string) => void // retained for interface compatibility; not called in tmux path
): Promise<ExecutionResult> {
  const start = Date.now()
  const prompt = buildPrompt(instruction, context, mode, provider)

  const { output: rawOutput, timedOut, error } = await runInTmux(provider, prompt)

  const output = rawOutput.length > 4000 ? rawOutput.slice(-4000) : rawOutput
  const changedFiles = getChangedFiles()
  const approvalBlocks = parseApprovalBlocks(rawOutput)

  let buildStatus = parseBuildStatus(rawOutput)
  if (buildStatus === 'unknown' && hasCodeChanges(changedFiles) && !timedOut && !error) {
    console.log('[executor] build status unknown — running build check')
    buildStatus = runBuildCheck()
    console.log('[executor] build check result:', buildStatus)
  }

  return {
    output,
    changedFiles,
    commitHash: getLastCommit(),
    buildStatus,
    approvalBlocks,
    elapsedMs: Date.now() - start,
    timedOut,
    error,
  }
}
