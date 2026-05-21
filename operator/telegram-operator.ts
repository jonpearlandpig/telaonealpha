// TELAOne Telegram Operator Runtime
// Deployment control from iPhone via Telegram
// Authority: Jon Hartman

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_PATH = process.env.REPO_PATH || process.cwd()
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID
  ? parseInt(process.env.TELEGRAM_CHAT_ID, 10)
  : null
const REPO_OWNER = 'jonpearlandpig'
const REPO_NAME = 'telaonealpha'
const WORK_BRANCH = 'work'

interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

// Pending push state — cleared after 5 minutes or on confirmation
let pendingPush: { diff: string; statusSummary: string; timestamp: number } | null = null

async function runCommand(cmd: string, timeoutMs = 120000): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: REPO_PATH, timeout: timeoutMs })
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 }
  } catch (err: any) {
    return {
      stdout: err.stdout?.trim() ?? '',
      stderr: err.stderr?.trim() ?? err.message ?? '',
      exitCode: typeof err.code === 'number' ? err.code : 1,
    }
  }
}

async function getCurrentBranch(): Promise<string> {
  const r = await runCommand('git rev-parse --abbrev-ref HEAD')
  return r.stdout
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function handlePull(): Promise<string> {
  const r = await runCommand('git pull origin main')
  if (r.exitCode !== 0) return `Pull failed:\n\`\`\`\n${r.stderr}\n\`\`\``
  return `Pull complete.\n\`\`\`\n${r.stdout || 'Already up to date.'}\n\`\`\``
}

async function handleStatus(): Promise<string> {
  const [branchR, statusR, shaR] = await Promise.all([
    runCommand('git rev-parse --abbrev-ref HEAD'),
    runCommand('git status --short'),
    runCommand('git rev-parse --short HEAD'),
  ])
  const branch = branchR.stdout
  const status = statusR.stdout || '(clean)'
  const sha = shaR.stdout
  return `*Branch:* \`${branch}\`\n*SHA:* \`${sha}\`\n\`\`\`\n${status}\n\`\`\``
}

async function handleBuild(): Promise<string> {
  const r = await runCommand('npm run build', 180000)
  if (r.exitCode !== 0) {
    const tail = r.stderr.split('\n').slice(-20).join('\n')
    return `Build failed:\n\`\`\`\n${tail}\n\`\`\``
  }
  const shaR = await runCommand('git rev-parse --short HEAD')
  return `Build passed. SHA: \`${shaR.stdout}\`\nDoes not deploy — merge PR to trigger Vercel.`
}

async function handlePush(): Promise<string> {
  const branch = await getCurrentBranch()
  if (branch === 'main') {
    return `ERROR: Cannot push directly to main. Switch to branch: \`${WORK_BRANCH}\``
  }

  // Run build first
  const buildR = await runCommand('npm run build', 180000)
  if (buildR.exitCode !== 0) {
    const tail = buildR.stderr.split('\n').slice(-20).join('\n')
    return `Build failed. Push blocked.\n\`\`\`\n${tail}\n\`\`\``
  }

  // Show what will be pushed
  const [statusR, diffR] = await Promise.all([
    runCommand('git status --short'),
    runCommand(`git log origin/${WORK_BRANCH}..HEAD --oneline 2>/dev/null || git log --oneline -5`),
  ])
  const statusSummary = statusR.stdout || '(no uncommitted changes)'
  const diff = diffR.stdout || '(no unpushed commits)'

  pendingPush = { diff, statusSummary, timestamp: Date.now() }

  return (
    `*About to push to branch:* \`${branch}\`\n\n` +
    `*Staged changes:*\n\`\`\`\n${statusSummary}\n\`\`\`\n\n` +
    `*Commits to push:*\n\`\`\`\n${diff}\n\`\`\`\n\n` +
    `Send /pushconfirm to execute, or do nothing to cancel (expires in 5 min).`
  )
}

async function handlePushConfirm(): Promise<string> {
  if (!pendingPush) {
    return `No pending push. Run /push first.`
  }
  if (Date.now() - pendingPush.timestamp > 5 * 60 * 1000) {
    pendingPush = null
    return `Push confirmation expired. Run /push again.`
  }

  const branch = await getCurrentBranch()
  if (branch === 'main') {
    pendingPush = null
    return `ERROR: Cannot push to main. This should not happen.`
  }

  pendingPush = null

  const timestamp = new Date().toISOString()
  const addR = await runCommand('git add .')
  if (addR.exitCode !== 0) return `git add failed:\n\`\`\`\n${addR.stderr}\n\`\`\``

  // Check if there's anything to commit
  const diffIndexR = await runCommand('git diff --cached --quiet')
  if (diffIndexR.exitCode === 0) {
    // Nothing staged, just push existing commits
    const pushR = await runCommand(`git push origin ${branch}`)
    if (pushR.exitCode !== 0) return `Push failed:\n\`\`\`\n${pushR.stderr}\n\`\`\``
    const shaR = await runCommand('git rev-parse --short HEAD')
    return `Push complete.\nSHA: \`${shaR.stdout}\`\nRun /pr to open a PR.`
  }

  const commitR = await runCommand(
    `git commit -m "Telegram operator push — ${timestamp}"`
  )
  if (commitR.exitCode !== 0) return `Commit failed:\n\`\`\`\n${commitR.stderr}\n\`\`\``

  const pushR = await runCommand(`git push origin ${branch}`)
  if (pushR.exitCode !== 0) return `Push failed:\n\`\`\`\n${pushR.stderr}\n\`\`\``

  const shaR = await runCommand('git rev-parse --short HEAD')
  return `Push complete. SHA: \`${shaR.stdout}\`\nRun /pr to open a PR from \`${branch}\` → \`main\`.`
}

async function handlePr(): Promise<string> {
  if (!GITHUB_TOKEN) {
    return `GITHUB_TOKEN not set. Add it to your .env and restart the operator.`
  }

  const branch = await getCurrentBranch()
  const timestamp = new Date().toISOString()

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TELAOne-Operator/1.0',
      },
      body: JSON.stringify({
        title: `Telegram operator push — ${timestamp}`,
        head: branch,
        base: 'main',
        body: 'Automated PR from TELAOne Telegram Operator Runtime.',
      }),
    }
  )

  const pr = (await response.json()) as any

  if (!response.ok) {
    // PR may already exist
    if (pr.errors?.[0]?.message?.includes('already exists')) {
      return `PR already exists for \`${branch}\` → \`main\`. Open GitHub to merge.`
    }
    return `PR creation failed:\n\`\`\`\n${JSON.stringify(pr, null, 2).slice(0, 500)}\n\`\`\``
  }

  return `PR created: ${pr.html_url}`
}

async function handleDeploy(): Promise<string> {
  const pullR = await runCommand('git pull origin main')
  if (pullR.exitCode !== 0) return `Pull failed:\n\`\`\`\n${pullR.stderr}\n\`\`\``

  const buildR = await runCommand('npm run build', 180000)
  if (buildR.exitCode !== 0) {
    const tail = buildR.stderr.split('\n').slice(-20).join('\n')
    return `Build failed. Do not push.\n\`\`\`\n${tail}\n\`\`\``
  }

  const shaR = await runCommand('git rev-parse --short HEAD')
  return (
    `Build passed. SHA: \`${shaR.stdout}\`\n` +
    `Merge the PR to deploy to production — Vercel will auto-deploy from main.`
  )
}

async function handleSha(): Promise<string> {
  const [localR, remoteR] = await Promise.all([
    runCommand('git rev-parse HEAD'),
    runCommand('git ls-remote origin refs/heads/main'),
  ])
  const localSha = localR.stdout.slice(0, 12)
  const remoteRaw = remoteR.stdout.split('\t')[0]?.trim() ?? ''
  const remoteSha = remoteRaw.slice(0, 12)
  const synced = localSha && remoteSha && localSha === remoteSha
  const syncStatus = synced ? 'IN SYNC' : 'DIVERGED'
  return `Local:  \`${localSha || 'unknown'}\`\nRemote: \`${remoteSha || 'unknown'}\`\nStatus: *${syncStatus}*`
}

async function handleLog(): Promise<string> {
  const r = await runCommand('git log --oneline -5')
  return r.exitCode === 0
    ? `*Last 5 commits:*\n\`\`\`\n${r.stdout}\n\`\`\``
    : `Could not read log:\n\`\`\`\n${r.stderr}\n\`\`\``
}

function handleHelp(): string {
  return (
    `*TELAOne Operator Runtime*\n\n` +
    `/pull          — git pull origin main\n` +
    `/status        — current branch + git status + SHA\n` +
    `/build         — npm run build (does not deploy)\n` +
    `/push          — stage + commit + push to work branch (requires /pushconfirm)\n` +
    `/pushconfirm   — execute the push after reviewing changes\n` +
    `/pr            — create PR from work → main via GitHub API\n` +
    `/deploy        — pull + build + status report\n` +
    `/sha           — compare local HEAD vs remote main SHA\n` +
    `/log           — last 5 commits\n` +
    `/help          — this list`
  )
}

async function handleCommand(text: string): Promise<string> {
  const cmd = text.trim().split(/\s+/)[0].toLowerCase()
  switch (cmd) {
    case '/pull':         return handlePull()
    case '/status':       return handleStatus()
    case '/build':        return handleBuild()
    case '/push':         return handlePush()
    case '/pushconfirm':  return handlePushConfirm()
    case '/pr':           return handlePr()
    case '/deploy':       return handleDeploy()
    case '/sha':          return handleSha()
    case '/log':          return handleLog()
    case '/help':         return handleHelp()
    case '/start':        return handleHelp()
    default:
      return `Unknown command: \`${cmd}\`\nSend /help to see all commands.`
  }
}

// ── Telegram polling loop ─────────────────────────────────────────────────────

async function getUpdates(offset: number): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&timeout=30`,
      { signal: AbortSignal.timeout(40000) }
    )
    if (!res.ok) return []
    const data = (await res.json()) as any
    return data.result ?? []
  } catch {
    return []
  }
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

async function main(): Promise<void> {
  if (!TELEGRAM_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is required.')
    process.exit(1)
  }

  console.log(`TELAOne Telegram operator runtime starting.`)
  console.log(`Repo: ${REPO_PATH}`)
  console.log(`Allowed chat: ${ALLOWED_CHAT_ID ?? '(any — set TELEGRAM_CHAT_ID to restrict)'}`)

  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const updates = await getUpdates(offset)

    for (const update of updates) {
      offset = update.update_id + 1
      if (!update.message?.text) continue

      const chatId: number = update.message.chat.id

      if (ALLOWED_CHAT_ID !== null && chatId !== ALLOWED_CHAT_ID) {
        await sendMessage(chatId, 'Unauthorized.')
        continue
      }

      const text: string = update.message.text
      console.log(`[${new Date().toISOString()}] ${chatId}: ${text}`)

      try {
        const response = await handleCommand(text)
        await sendMessage(chatId, response)
      } catch (err: any) {
        await sendMessage(chatId, `Runtime error: ${err.message}`)
        console.error(err)
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
