import { spawn, execSync } from 'child_process'
import type { RepoContext } from './contextGatherer'

const REPO_ROOT = process.cwd()
const TIMEOUT_MS = 5 * 60 * 1000

export type BuildStatus = 'passed' | 'failed' | 'unknown'

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
      suggestedAction: `Add "Bash(${blockedCommand})" to .claude/settings.json allowlist, then retry.`,
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

function buildPrompt(instruction: string, context: RepoContext, mode: string): string {
  return `# TELA Operator Relay — ${mode.toUpperCase()} instruction

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

export async function executeInstruction(
  instruction: string,
  context: RepoContext,
  mode: string,
  onProgress?: (chunk: string) => void
): Promise<ExecutionResult> {
  const start = Date.now()
  const prompt = buildPrompt(instruction, context, mode)
  const outputChunks: string[] = []
  let timedOut = false
  let error: string | null = null

  await new Promise<void>((resolve) => {
    const proc = spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
      cwd: REPO_ROOT,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => {
      timedOut = true
      proc.kill('SIGTERM')
      resolve()
    }, TIMEOUT_MS)

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      outputChunks.push(text)
      onProgress?.(text)
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      outputChunks.push(chunk.toString())
    })

    proc.on('error', (err) => {
      error = `Failed to spawn claude: ${err.message}`
      clearTimeout(timer)
      resolve()
    })

    proc.on('close', () => {
      clearTimeout(timer)
      resolve()
    })
  })

  const rawOutput = outputChunks.join('').trim()
  const output = rawOutput.length > 4000 ? rawOutput.slice(-4000) : rawOutput

  const changedFiles = getChangedFiles()
  const approvalBlocks = parseApprovalBlocks(rawOutput)

  // If Claude's output doesn't confirm a build result, run it ourselves when code changed
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
