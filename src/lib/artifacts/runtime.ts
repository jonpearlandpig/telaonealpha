import { deterministicArtifactId, type ArtifactRecord } from './artifactStore'

export type ArtifactInputContext = {
  threadId: string
  sourcePrompt: string
  assistantText: string
  parentArtifactId?: string
}

type ParsedBlock = { lang?: string; content: string }

type ArtifactFormat = 'html' | 'markdown' | 'json' | 'tsx' | 'jsx' | 'txt' | 'yaml'

const FORMAT_META: Record<ArtifactFormat, { mimeType: string; extension: string; title: string }> = {
  html: { mimeType: 'text/html', extension: 'html', title: 'HTML artifact' },
  markdown: { mimeType: 'text/markdown', extension: 'md', title: 'Markdown artifact' },
  json: { mimeType: 'application/json', extension: 'json', title: 'JSON artifact' },
  tsx: { mimeType: 'text/tsx', extension: 'tsx', title: 'TSX artifact' },
  jsx: { mimeType: 'text/jsx', extension: 'jsx', title: 'JSX artifact' },
  txt: { mimeType: 'text/plain', extension: 'txt', title: 'Text artifact' },
  yaml: { mimeType: 'application/yaml', extension: 'yaml', title: 'YAML artifact' },
}

function extractFencedBlocks(text: string): ParsedBlock[] {
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
  const blocks: ParsedBlock[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const content = match[2].trim()
    if (!content) continue
    blocks.push({ lang: match[1]?.toLowerCase(), content })
  }
  return blocks
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'artifact'
}

function inferFormat(lang?: string, content?: string): ArtifactFormat {
  const l = (lang || '').toLowerCase()
  if (l === 'html') return 'html'
  if (l === 'md' || l === 'markdown') return 'markdown'
  if (l === 'json') return 'json'
  if (l === 'tsx') return 'tsx'
  if (l === 'jsx') return 'jsx'
  if (l === 'yaml' || l === 'yml') return 'yaml'
  if (l === 'txt' || l === 'text') return 'txt'

  const body = content || ''
  if (/^\s*<!doctype html>|<html|<body|<div/i.test(body)) return 'html'
  if (/^\s*[{\[]/.test(body)) {
    try {
      JSON.parse(body)
      return 'json'
    } catch {
      // noop
    }
  }
  if (/^\s*#\s|\n##\s/m.test(body)) return 'markdown'
  if (/^\s*[\w-]+:\s+/m.test(body)) return 'yaml'
  return 'txt'
}

function defaultName(format: ArtifactFormat, prompt: string, index: number): string {
  const root = slugify(prompt.split(/[.\n]/)[0] || 'artifact')
  if (format === 'html') return 'landing-page'
  if (format === 'markdown') return 'runtime-summary'
  if (format === 'json') return 'continuity-map'
  if (format === 'yaml') return 'akb-export'
  return `${root || 'runtime-artifact'}-${index + 1}`
}

function materializeArtifact(ctx: ArtifactInputContext, format: ArtifactFormat, payload: string, createdAt: string, groupId: string, index: number): ArtifactRecord {
  const meta = FORMAT_META[format]
  const lineageId = ctx.parentArtifactId ?? `${ctx.threadId}-root`
  const fileName = `${defaultName(format, ctx.sourcePrompt, index)}.${meta.extension}`
  const id = deterministicArtifactId({ title: `${ctx.threadId}-${groupId}-${fileName}-${index}`, threadId: ctx.threadId, sessionId: format, createdAt })

  return {
    id,
    title: meta.title,
    threadId: ctx.threadId,
    sessionId: format,
    prompt: ctx.sourcePrompt,
    structure: `format=${format}; parent=${ctx.parentArtifactId ?? 'none'}; group=${groupId}; file=${fileName}`,
    code: format === 'tsx' || format === 'jsx' || format === 'txt' || format === 'yaml' ? payload : undefined,
    html: format === 'html' ? payload : undefined,
    markdown: format === 'markdown' ? payload : undefined,
    text: format === 'json' ? payload : format === 'txt' ? payload : undefined,
    mimeType: meta.mimeType,
    fileName,
    entities: [],
    projects: ['telaone'],
    lineageId,
    artifactGroupId: groupId,
    createdAt,
    pinned: false,
    classification: 'runtime_artifact',
  }
}

export function extractArtifactsFromAssistant(ctx: ArtifactInputContext): ArtifactRecord[] {
  const createdAt = new Date().toISOString()
  const blocks = extractFencedBlocks(ctx.assistantText)
  const groupId = deterministicArtifactId({ title: `group-${ctx.sourcePrompt.slice(0, 40)}`, threadId: ctx.threadId, sessionId: 'group', createdAt })
  const payloads = blocks.length ? blocks : [{ content: ctx.assistantText }]

  return payloads.map((block, index) => {
    const format = inferFormat(block.lang, block.content)
    return materializeArtifact(ctx, format, block.content, createdAt, groupId, index)
  })
}

export function extractArtifactFromAssistant(ctx: ArtifactInputContext): ArtifactRecord {
  return extractArtifactsFromAssistant(ctx)[0]
}
