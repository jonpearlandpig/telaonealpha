import { deterministicArtifactId, type ArtifactRecord } from './artifactStore'

export type ArtifactInputContext = {
  threadId: string
  sourcePrompt: string
  assistantText: string
  parentArtifactId?: string
}

function detectKind(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return 'html'
  if (/```(?:tsx|jsx|ts|js)/i.test(text)) return 'code'
  if (/^#|\n## /m.test(text)) return 'markdown'
  if (/continuity|operational|export/i.test(text)) return 'document'
  return 'response'
}

export function extractArtifactFromAssistant(ctx: ArtifactInputContext): ArtifactRecord {
  const kind = detectKind(ctx.assistantText)
  const createdAt = new Date().toISOString()
  const title = `${kind.toUpperCase()} artifact`
  const lineageId = ctx.parentArtifactId ?? `${ctx.threadId}-root`
  const id = deterministicArtifactId({ title, threadId: ctx.threadId, sessionId: kind, createdAt })

  return {
    id,
    title,
    threadId: ctx.threadId,
    sessionId: kind,
    prompt: ctx.sourcePrompt,
    structure: `kind=${kind}; parent=${ctx.parentArtifactId ?? 'none'}`,
    code: kind === 'code' ? ctx.assistantText : undefined,
    html: kind === 'html' ? ctx.assistantText : undefined,
    entities: [],
    projects: ['telaone'],
    lineageId,
    createdAt,
    pinned: false,
  }
}
