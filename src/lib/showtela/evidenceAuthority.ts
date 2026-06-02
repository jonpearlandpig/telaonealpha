import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { ContinuityEvent } from './types'
import {
  SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
  SHOWTELA_RUNTIME_THREAD_ID,
} from './runtimeIds'

export type EvidenceChunk = {
  id: string
  sourceFile: string
  sourceSection: string
  sourceSpan: string
  extractedText: string
  lineStart: number
  lineEnd: number
}

export type OperationalFactAnswer = {
  answer: string
  sourceFile: string
  sourceSection: string
  matchingText: string
  evidenceChunkId: string
}

function hashSeed(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619
  return Math.abs(h >>> 0).toString(36)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeRole(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function sectionFromHeading(line: string) {
  return line.replace(/^#+\s+/, '').trim()
}

function isTableSeparator(line: string) {
  return /^\|[-|\s:]+\|?$/.test(line.trim())
}

function collectSourceBlocks(lines: string[]) {
  const blocks: Array<{ text: string; lineStart: number; lineEnd: number; section: string }> = []
  let currentSection = 'Document'

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? ''
    const line = rawLine.trim()
    if (!line) continue

    if (/^#+\s+/.test(line)) {
      currentSection = sectionFromHeading(line)
      continue
    }

    if (isTableSeparator(line)) continue

    if (line.startsWith('|') && (parseTableCells(line).length < 5 || !line.endsWith('|'))) {
      const collected = [line]
      let endIndex = index
      for (let lookahead = index + 1; lookahead < lines.length; lookahead += 1) {
        const next = (lines[lookahead] ?? '').trim()
        if (!next || /^#+\s+/.test(next) || isTableSeparator(next)) break
        if (next.startsWith('|') && parseTableCells(collected.join(' ')).length >= 5 && collected.join(' ').trim().endsWith('|')) break
        collected.push(next)
        endIndex = lookahead
        if (parseTableCells(collected.join(' ')).length >= 5 && collected.join(' ').trim().endsWith('|')) break
      }
      blocks.push({
        text: collected.join(' ').replace(/\s+/g, ' ').trim(),
        lineStart: index + 1,
        lineEnd: endIndex + 1,
        section: currentSection,
      })
      index = endIndex
      continue
    }

    blocks.push({
      text: line,
      lineStart: index + 1,
      lineEnd: index + 1,
      section: currentSection,
    })
  }

  return blocks
}

export function parseTableCells(row: string) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

export function createEvidenceChunkId(input: {
  sourceFile: string
  sourceSection: string
  sourceSpan: string
  extractedText: string
}) {
  return `ev_${hashSeed(`${input.sourceFile}|${input.sourceSection}|${input.sourceSpan}|${input.extractedText}`)}`
}

export function createEvidenceChunksFromText(input: {
  sourceFile: string
  extractedText: string
}): EvidenceChunk[] {
  const lines = input.extractedText.split(/\r?\n/)
  return collectSourceBlocks(lines).map((block) => {
    const sourceSpan = block.lineStart === block.lineEnd
      ? `line ${block.lineStart}`
      : `lines ${block.lineStart}-${block.lineEnd}`
    const id = createEvidenceChunkId({
      sourceFile: input.sourceFile,
      sourceSection: block.section,
      sourceSpan,
      extractedText: block.text,
    })

    return {
      id,
      sourceFile: input.sourceFile,
      sourceSection: block.section,
      sourceSpan,
      extractedText: block.text,
      lineStart: block.lineStart,
      lineEnd: block.lineEnd,
    }
  })
}

export function evidenceChunkToArtifact(chunk: EvidenceChunk, createdAt: string): ArtifactRecord {
  return {
    id: chunk.id,
    title: `Evidence Chunk - ${chunk.sourceFile} - ${chunk.sourceSpan}`,
    threadId: SHOWTELA_RUNTIME_THREAD_ID,
    sessionId: 'showtela-evidence-authority',
    text: chunk.extractedText,
    fileName: chunk.sourceFile,
    mimeType: 'text/plain',
    entities: [],
    projects: [],
    artifactGroupId: SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
    createdAt,
    pinned: false,
    classification: 'runtime_artifact',
    structure: JSON.stringify({
      kind: 'evidence-chunk',
      evidenceChunk: chunk,
    }),
  }
}

export function parseEvidenceChunkArtifact(artifact: ArtifactRecord): EvidenceChunk | null {
  if (!artifact.structure) return null
  try {
    const parsed = JSON.parse(artifact.structure) as {
      kind?: string
      evidenceChunk?: EvidenceChunk
    }
    if (parsed.kind !== 'evidence-chunk' || !parsed.evidenceChunk?.id) return null
    return parsed.evidenceChunk
  } catch {
    return null
  }
}

function factFromTableRow(chunk: EvidenceChunk, requestedRole: string): OperationalFactAnswer | null {
  const cells = parseTableCells(chunk.extractedText)
  if (cells.length < 2) return null
  const [role, name] = cells
  if (!role || !name) return null
  if (normalizeRole(role) !== normalizeRole(requestedRole)) return null
  return {
    answer: `${role}: ${name}`,
    sourceFile: chunk.sourceFile,
    sourceSection: chunk.sourceSection,
    matchingText: chunk.extractedText,
    evidenceChunkId: chunk.id,
  }
}

function factFromBullet(chunk: EvidenceChunk, requestedRole: string): OperationalFactAnswer | null {
  const text = chunk.extractedText.replace(/^[-*]\s+/, '').trim()
  const separators = [' — ', ' – ', ' - ', ': ']
  for (const separator of separators) {
    const index = text.indexOf(separator)
    if (index <= 0) continue
    const role = text.slice(0, index).trim()
    if (normalizeRole(role) !== normalizeRole(requestedRole)) return null
    return {
      answer: text,
      sourceFile: chunk.sourceFile,
      sourceSection: chunk.sourceSection,
      matchingText: chunk.extractedText,
      evidenceChunkId: chunk.id,
    }
  }
  return null
}

export function answerRoleFromEvidenceChunks(
  chunks: EvidenceChunk[],
  requestedRole: string,
): OperationalFactAnswer | null {
  for (const chunk of chunks) {
    const tableAnswer = factFromTableRow(chunk, requestedRole)
    if (tableAnswer) return tableAnswer
    const bulletAnswer = factFromBullet(chunk, requestedRole)
    if (bulletAnswer) return bulletAnswer
  }
  return null
}

export function answerRoleFromEvidenceArtifacts(
  artifacts: ArtifactRecord[],
  requestedRole: string,
): OperationalFactAnswer | null {
  return answerRoleFromEvidenceChunks(
    artifacts.map(parseEvidenceChunkArtifact).filter((chunk): chunk is EvidenceChunk => Boolean(chunk)),
    requestedRole,
  )
}

export function evidenceChunkIdsForText(chunks: EvidenceChunk[], text: string) {
  const needle = text.toLowerCase()
  return chunks
    .filter((chunk) => chunk.extractedText.toLowerCase().includes(needle))
    .map((chunk) => chunk.id)
}

export function evidenceChunkIdsForEvent(event: ContinuityEvent, chunks: EvidenceChunk[]) {
  const source = [
    event.headline,
    event.body,
    ...(event.linkedEntities ?? []),
    event.owner?.name,
  ].filter(Boolean).join(' ').toLowerCase()

  const matched = chunks.filter((chunk) => {
    const text = chunk.extractedText.toLowerCase()
    return text.split(/[^a-z0-9@.+-]+/).some((token) => token.length >= 4 && source.includes(token))
  })

  return matched.length > 0 ? matched.map((chunk) => chunk.id) : chunks.map((chunk) => chunk.id)
}

export function sourceFileLabel(name: string) {
  return name.trim() || `source-${slugify(new Date().toISOString())}`
}
