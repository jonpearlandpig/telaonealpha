import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID
  ? parseInt(process.env.TELEGRAM_CHAT_ID, 10)
  : null
const REPO_OWNER = 'jonpearlandpig'
const REPO_NAME = 'telaonealpha'
const WORK_BRANCH = 'work'
const BASE_BRANCH = 'main'

// ── GitHub API helpers ────────────────────────────────────────────────────────

async function github(path: string, opts: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'TELAOne-Operator/1.0',
      ...(opts.headers ?? {}),
    },
  })
  return res
}

async function getBranchSha(branch: string): Promise<string> {
  const res = await github(`/commits/${branch}`)
  const data = await res.json()
  return data.sha ?? 'unknown'
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleStatus(): Promise<string> {
  const [workRes, mainRes] = await Promise.all([
    github(`/commits/${WORK_BRANCH}`),
    github(`/commits/${BASE_BRANCH}`),
  ])
  const work = await workRes.json()
  const main = await mainRes.json()

  const workSha = (work.sha ?? 'unknown').slice(0, 12)
  const mainSha = (main.sha ?? 'unknown').slice(0, 12)
  const workMsg = work.commit?.message?.split('\n')[0] ?? '—'
  const mainMsg = main.commit?.message?.split('\n')[0] ?? '—'

  return (
    `*Branch status*\n\n` +
    `\`work\`  \`${workSha}\`\n${workMsg}\n\n` +
    `\`main\`  \`${mainSha}\`\n${mainMsg}`
  )
}

async function handleLog(): Promise<string> {
  const res = await github(`/commits?sha=${WORK_BRANCH}&per_page=5`)
  const commits = await res.json()
  if (!Array.isArray(commits)) return 'Could not fetch commits.'
  const lines = commits.map((c: any) => {
    const sha = (c.sha ?? '').slice(0, 8)
    const msg = c.commit?.message?.split('\n')[0] ?? '—'
    return `\`${sha}\` ${msg}`
  })
  return `*Last 5 commits on \`${WORK_BRANCH}\`:*\n${lines.join('\n')}`
}

async function handleSha(): Promise<string> {
  const [localSha, remoteSha] = await Promise.all([
    getBranchSha(WORK_BRANCH),
    getBranchSha(BASE_BRANCH),
  ])
  const local = localSha.slice(0, 12)
  const remote = remoteSha.slice(0, 12)
  const status = local === remote ? 'IN SYNC' : 'DIVERGED'
  return `Work:  \`${local}\`\nMain:  \`${remote}\`\nStatus: *${status}*`
}

async function handlePush(): Promise<string> {
  // Check if work is ahead of main
  const res = await github(`/compare/${BASE_BRANCH}...${WORK_BRANCH}`)
  const data = await res.json()

  if (!res.ok) return `Could not compare branches:\n\`${data.message ?? 'unknown error'}\``

  const ahead = data.ahead_by ?? 0
  const behind = data.behind_by ?? 0

  if (ahead === 0) {
    return `\`${WORK_BRANCH}\` has no new commits ahead of \`${BASE_BRANCH}\`. Nothing to push.`
  }

  const commits = (data.commits ?? []).slice(0, 5).map((c: any) => {
    const sha = (c.sha ?? '').slice(0, 8)
    const msg = c.commit?.message?.split('\n')[0] ?? '—'
    return `\`${sha}\` ${msg}`
  })

  return (
    `*Ready to push:*\n` +
    `\`${WORK_BRANCH}\` is *${ahead} commit${ahead === 1 ? '' : 's'} ahead* of \`${BASE_BRANCH}\`${behind > 0 ? `, ${behind} behind` : ''}.\n\n` +
    commits.join('\n') +
    `\n\nSend /pr to create a PR and trigger Vercel deploy.`
  )
}

async function handlePr(): Promise<string> {
  if (!GITHUB_TOKEN) return 'GITHUB_TOKEN not configured.'

  const timestamp = new Date().toISOString()

  // Check if PR already exists
  const existingRes = await github(
    `/pulls?head=${REPO_OWNER}:${WORK_BRANCH}&base=${BASE_BRANCH}&state=open`
  )
  const existing = await existingRes.json()
  if (Array.isArray(existing) && existing.length > 0) {
    return `PR already open: ${existing[0].html_url}`
  }

  // Check if there's anything to PR
  const compareRes = await github(`/compare/${BASE_BRANCH}...${WORK_BRANCH}`)
  const compare = await compareRes.json()
  if ((compare.ahead_by ?? 0) === 0) {
    return `\`${WORK_BRANCH}\` has no new commits. Nothing to PR.`
  }

  const res = await github('/pulls', {
    method: 'POST',
    body: JSON.stringify({
      title: `Operator push — ${timestamp}`,
      head: WORK_BRANCH,
      base: BASE_BRANCH,
      body: 'Deployed from TELAOne Telegram Operator Runtime.',
    }),
  })

  const pr = await res.json()
  if (!res.ok) {
    return `PR creation failed: ${pr.message ?? JSON.stringify(pr).slice(0, 200)}`
  }

  return `PR created: ${pr.html_url}\nMerge it in GitHub to deploy to production.`
}

async function handleDeploy(): Promise<string> {
  // Show comparison + PR status — Vercel deploys on merge, not on push
  const [compareRes, prsRes] = await Promise.all([
    github(`/compare/${BASE_BRANCH}...${WORK_BRANCH}`),
    github(`/pulls?head=${REPO_OWNER}:${WORK_BRANCH}&base=${BASE_BRANCH}&state=open`),
  ])
  const compare = await compareRes.json()
  const prs = await prsRes.json()

  const ahead = compare.ahead_by ?? 0
  const prOpen = Array.isArray(prs) && prs.length > 0

  if (ahead === 0) {
    return `\`${WORK_BRANCH}\` is in sync with \`${BASE_BRANCH}\`. Vercel is up to date.`
  }

  const prLine = prOpen
    ? `PR open: ${prs[0].html_url}`
    : `No open PR — run /pr to create one.`

  return (
    `*Deploy status*\n` +
    `\`${WORK_BRANCH}\` is *${ahead} commit${ahead === 1 ? '' : 's'} ahead* of \`${BASE_BRANCH}\`.\n\n` +
    prLine +
    `\n\nMerge the PR → Vercel auto-deploys.`
  )
}

function handleHelp(): string {
  return (
    `*TELAOne Operator Runtime*\n\n` +
    `/status  — branch SHAs + latest commit messages\n` +
    `/log     — last 5 commits on \`work\`\n` +
    `/sha     — compare \`work\` vs \`main\` SHA\n` +
    `/push    — show commits ready to ship\n` +
    `/pr      — create PR from \`work\` → \`main\`\n` +
    `/deploy  — deployment status + PR link\n` +
    `/help    — this list`
  )
}

async function handleCommand(text: string): Promise<string> {
  const cmd = text.trim().split(/\s+/)[0].toLowerCase()
  switch (cmd) {
    case '/status':  return handleStatus()
    case '/log':     return handleLog()
    case '/sha':     return handleSha()
    case '/push':    return handlePush()
    case '/pr':      return handlePr()
    case '/deploy':  return handleDeploy()
    case '/help':    return handleHelp()
    case '/start':   return handleHelp()
    default:
      return `Unknown command: \`${cmd}\`\nSend /help for the full list.`
  }
}

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId: number = message.chat.id
    if (ALLOWED_CHAT_ID !== null && chatId !== ALLOWED_CHAT_ID) {
      await sendMessage(chatId, 'Unauthorized.')
      return NextResponse.json({ ok: true })
    }

    const response = await handleCommand(message.text)
    await sendMessage(chatId, response)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Telegram operator error:', err)
    return NextResponse.json({ ok: true })
  }
}

// Telegram requires a 200 response to GET for webhook verification
export async function GET() {
  return NextResponse.json({ ok: true, service: 'TELAOne Telegram Operator' })
}
