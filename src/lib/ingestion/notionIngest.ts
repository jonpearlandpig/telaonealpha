import { chunkContinuityText } from './chunking'
import { extractIngestionEntities } from './entityExtraction'
import { createProvenance } from './provenance'
import { createEvidenceChunksFromText } from '@/lib/showtela/evidenceAuthority'
import { evidenceChunkToArtifact } from '@/lib/showtela/evidenceAuthority'

export type MemoryTier = 'canonical' | 'volatile'

// Documents that should be ingested as evidence chunks (row-level granularity)
// rather than continuity blobs. Add any document type that contains
// role-to-person mappings, contact directories, or structured fact tables.
const EVIDENCE_DOCUMENT_PATTERNS = [
  /crew/i,
  /anchor\s*directory/i,
  /contact/i,
  /directory/i,
  /roster/i,
  /team\s*list/i,
  /call\s*sheet/i,
  /staff/i,
  /personnel/i,
  /org\s*chart/i,
  /leadership/i,
]

function isEvidenceDocument(title: string): boolean {
  return EVIDENCE_DOCUMENT_PATTERNS.some((p) => p.test(title))
}

export type NotionIngestInput = {
  pageId: string
  title: string
  content: string
  author?: string
  workspace?: string
  threadRef?: string
  timestamp?: string
  parentLineageId?: string
  memoryTier?: MemoryTier
}

export function ingestNotionOperationalObject(input: NotionIngestInput) {
  const provenance = createProvenance({
    source: `notion:${input.pageId}`,
    author: input.author,
    timestamp: input.timestamp,
    parentLineageId: input.parentLineageId,
    authorityConfidence: 0.85,
  })

  const entities = extractIngestionEntities(input.content, input.pageId, input.threadRef)

  const unresolvedHint = /unresolved|todo|follow-up|pending|waiting/i.test(input.content)
  const memoryTier: MemoryTier = input.memoryTier ?? (unresolvedHint ? 'volatile' : 'canonical')

  // ── Evidence documents: crew directories, rosters, contact lists ──────────
  // These use row-level chunking so factFromTableRow / factFromBullet can find
  // role-to-name mappings. Standard paragraph chunking buries them.
  if (isEvidenceDocument(input.title)) {
    const evidenceChunks = createEvidenceChunksFromText({
      sourceFile: input.title,
      extractedText: input.content,
    })

    const evidenceArtifacts = evidenceChunks.map((chunk) =>
      evidenceChunkToArtifact(chunk, input.timestamp ?? new Date().toISOString())
    )

    return {
      akbObjectId: `akb_${input.pageId}`,
      title: input.title,
      workspace: input.workspace ?? 'default',
      source: provenance.source,
      lineageId: provenance.lineageId,
      timestamp: provenance.timestamp,
      entities,
      // Evidence docs return fine-grained artifacts instead of coarse chunks
      chunks: [],
      evidenceArtifacts,
      continuitySnapshotSeed: {
        threadRef: input.threadRef,
        unresolvedHint,
        provenanceConfidence: provenance.authorityConfidence,
        memoryTier,
      },
      memoryTier,
      isEvidenceDocument: true,
    }
  }

  // ── Standard operational documents: paragraph-level chunking ─────────────
  const chunks = chunkContinuityText({
    text: input.content,
    threadRef: input.threadRef,
    entityRefs: entities.map((e) => e.id),
    provenanceRef: provenance.lineageId,
  })

  return {
    akbObjectId: `akb_${input.pageId}`,
    title: input.title,
    workspace: input.workspace ?? 'default',
    source: provenance.source,
    lineageId: provenance.lineageId,
    timestamp: provenance.timestamp,
    entities,
    chunks,
    evidenceArtifacts: [],
    continuitySnapshotSeed: {
      threadRef: input.threadRef,
      unresolvedHint,
      provenanceConfidence: provenance.authorityConfidence,
      memoryTier,
    },
    memoryTier,
    isEvidenceDocument: false,
  }
}
