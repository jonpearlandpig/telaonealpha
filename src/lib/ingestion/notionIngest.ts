import { chunkContinuityText } from './chunking'
import { extractIngestionEntities } from './entityExtraction'
import { createProvenance } from './provenance'

export type NotionIngestInput = {
  pageId: string
  title: string
  content: string
  author?: string
  workspace?: string
  threadRef?: string
  timestamp?: string
}

export function ingestNotionOperationalObject(input: NotionIngestInput) {
  const provenance = createProvenance({
    source: `notion:${input.pageId}`,
    author: input.author,
    timestamp: input.timestamp,
    authorityConfidence: 0.85,
  })
  const entities = extractIngestionEntities(input.content, input.pageId, input.threadRef)
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
    continuitySnapshotSeed: {
      threadRef: input.threadRef,
      unresolvedHint: /unresolved|todo|follow-up|pending|waiting/i.test(input.content),
      provenanceConfidence: provenance.authorityConfidence,
    },
  }
}
