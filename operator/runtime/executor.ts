import { spawn, execSync } from 'child_process'
import type { RepoContext } from './contextGatherer'

const REPO_ROOT = process.cwd()
const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export type ExecutionResult = {
  output: string
  changedFiles: string[]
  commitHash: string | null
  elapsedMs: number
  timedOut: boolean
  error: string | null
}

function getChangedFiles(): string[] {
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 5000 }).trim()
    return out ? out.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

function getLastCommitHash(): string | null {
  try {
    return execSync('git log --oneline -1', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 5000 }).trim() || null
  } catch {
    return null
  }
}

function buildPrompt(instruction: string, context: RepoContext, mode: string): string {
  return `# TELA Operator Relay — ${mode.toUpperCase()} instruction

## Repo Context
${context.summary}

## Instruction
${instruction}

## Rules
- Work only in this repo
- Do not expose env vars or credentials
- Do not force push
- Run npm run build to verify before committing
- Keep changes minimal and targeted
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
    const proc = spawn('claude', ['-p', prompt], {
      cwd: REPO_ROOT,
      env: { ...process.env, FORCE_COLOR: '0' },
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
      const text = chunk.toString()
      outputChunks.push(text)
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

  return {
    output,
    changedFiles: getChangedFiles(),
    commitHash: getLastCommitHash(),
    elapsedMs: Date.now() - start,
    timedOut,
    error,
  }
}
