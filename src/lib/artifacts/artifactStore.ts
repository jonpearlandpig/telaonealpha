export type ArtifactRecord = {
  id: string
  title: string
  threadId: string
  sessionId: string
  prompt?: string
  html?: string
  markdown?: string
  text?: string
  fileName?: string
  mimeType?: string
  previewUrl?: string
  code?: string
  structure?: string
  entities?: string[]
  projects?: string[]
  lineageId?: string
  artifactGroupId?: string
  createdAt: string
  pinned?: boolean
}

const STORAGE_KEY = 'telaone_artifacts_v1'

function hashSeed(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619
  return Math.abs(h >>> 0).toString(36)
}

export function deterministicArtifactId(input: Pick<ArtifactRecord, 'title' | 'threadId' | 'sessionId' | 'createdAt'>): string {
  return `art_${hashSeed(`${input.threadId}|${input.sessionId}|${input.title}|${input.createdAt}`)}`
}

export function loadArtifacts(): ArtifactRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ArtifactRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveArtifacts(artifacts: ArtifactRecord[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts))
}

export function upsertArtifact(input: Omit<ArtifactRecord, 'id'> & { id?: string }): ArtifactRecord {
  const artifacts = loadArtifacts()
  const id = input.id ?? deterministicArtifactId(input)
  const next: ArtifactRecord = { ...input, id }
  const idx = artifacts.findIndex((a) => a.id === id)
  if (idx >= 0) artifacts[idx] = next
  else artifacts.unshift(next)
  saveArtifacts(artifacts)
  return next
}


export function togglePinArtifact(id: string): ArtifactRecord[] {
  const artifacts = loadArtifacts().map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a))
  saveArtifacts(artifacts)
  return artifacts
}

export function findArtifactById(id: string): ArtifactRecord | undefined {
  return loadArtifacts().find((a) => a.id === id)
}
