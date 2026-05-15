export type ContinuityChunk = {
  id: string
  text: string
  threadRef?: string
  entityRefs: string[]
  provenanceRef?: string
  position: number
}

export function chunkContinuityText(input: { text: string; threadRef?: string; entityRefs?: string[]; provenanceRef?: string; maxChars?: number }): ContinuityChunk[] {
  const maxChars = input.maxChars ?? 900
  const lines = input.text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
  const chunks: ContinuityChunk[] = []
  let buffer = ''
  let idx = 0
  for (const line of lines) {
    if ((buffer + '\n\n' + line).length > maxChars && buffer) {
      chunks.push({ id: `chunk_${idx}`, text: buffer, threadRef: input.threadRef, entityRefs: input.entityRefs ?? [], provenanceRef: input.provenanceRef, position: idx })
      idx += 1
      buffer = line
    } else {
      buffer = buffer ? `${buffer}\n\n${line}` : line
    }
  }
  if (buffer) chunks.push({ id: `chunk_${idx}`, text: buffer, threadRef: input.threadRef, entityRefs: input.entityRefs ?? [], provenanceRef: input.provenanceRef, position: idx })
  return chunks
}
