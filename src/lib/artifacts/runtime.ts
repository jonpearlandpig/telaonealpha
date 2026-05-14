import { deterministicArtifactId, type ArtifactRecord } from './artifactStore'

export type ArtifactInputContext = {
  threadId: string
  sourcePrompt: string
  assistantText: string
  parentArtifactId?: string
}

type ParsedBlock = { lang?: string; content: string }

function detectKind(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return 'html'
  if (/```(?:tsx|jsx|ts|js)/i.test(text)) return 'code'
  if (/^#|\n## /m.test(text)) return 'markdown'
  if (/continuity|operational|export/i.test(text)) return 'document'
  return 'response'
}

function extractFencedBlocks(text: string): ParsedBlock[] {
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
  const blocks: ParsedBlock[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ lang: match[1]?.toLowerCase(), content: match[2].trim() })
  }
  return blocks
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'artifact'
}

function kindFromLang(lang?: string, content?: string): string {
  if (lang === 'html') return 'html'
  if (lang === 'md' || lang === 'markdown') return 'markdown'
  if (lang === 'json') return 'json'
  if (lang === 'tsx' || lang === 'jsx' || lang === 'ts' || lang === 'js') return 'code'
  return detectKind(content || '')
}

function materializeArtifact(ctx: ArtifactInputContext, kind: string, payload: string, createdAt: string, groupId: string, lang?: string): ArtifactRecord {
  const mimeType = kind === 'html' ? 'text/html' : kind === 'markdown' ? 'text/markdown' : kind === 'json' ? 'application/json' : kind === 'code' ? 'text/plain' : 'text/plain'
  const extension = kind === 'html' ? 'html' : kind === 'markdown' ? 'md' : kind === 'json' ? 'json' : kind === 'code' ? (lang || 'txt') : 'txt'
  const promptRoot = slugify(ctx.sourcePrompt.split(/[.\n]/)[0] || ctx.threadId)
  const root = kind === 'json' ? 'continuity-summary' : `${promptRoot}`
  const title = `${kind.toUpperCase()} artifact`
  const lineageId = ctx.parentArtifactId ?? `${ctx.threadId}-root`
  const id = deterministicArtifactId({ title: `${title}-${groupId}-${extension}`, threadId: ctx.threadId, sessionId: kind, createdAt })

  return {
    id,
    title,
    threadId: ctx.threadId,
    sessionId: kind,
    prompt: ctx.sourcePrompt,
    structure: `kind=${kind}; parent=${ctx.parentArtifactId ?? 'none'}; group=${groupId}`,
    code: kind === 'code' ? payload : undefined,
    html: kind === 'html' ? payload : undefined,
    markdown: kind === 'markdown' ? payload : undefined,
    text: kind === 'response' || kind === 'document' || kind === 'json' ? payload : undefined,
    mimeType,
    fileName: `${root}.${extension}`,
    entities: [],
    projects: ['telaone'],
    lineageId,
    artifactGroupId: groupId,
    createdAt,
    pinned: false,
  }
}

export function extractArtifactsFromAssistant(ctx: ArtifactInputContext): ArtifactRecord[] {
  const createdAt = new Date().toISOString()
  const blocks = extractFencedBlocks(ctx.assistantText)
  const groupId = deterministicArtifactId({ title: `group-${ctx.sourcePrompt.slice(0, 30)}`, threadId: ctx.threadId, sessionId: 'group', createdAt })
  if (blocks.length === 0) {
    return [materializeArtifact(ctx, detectKind(ctx.assistantText), ctx.assistantText, createdAt, groupId)]
  }
  return blocks.map((block) => {
    const kind = kindFromLang(block.lang, block.content)
    return materializeArtifact(ctx, kind, block.content, createdAt, groupId, block.lang)
  })
}

export function extractArtifactFromAssistant(ctx: ArtifactInputContext): ArtifactRecord {
  return extractArtifactsFromAssistant(ctx)[0]
}
