import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export type UnresolvedState = {
  unresolvedThreads: string[]
  unansweredQuestions: string[]
  stalledProjects: string[]
  incompleteArtifacts: string[]
  pendingLineageChains: string[]
}

export function extractUnresolvedState(artifacts: ArtifactRecord[]): UnresolvedState {
  const unresolvedArtifacts = artifacts.filter((a) => /unresolved|todo|follow-up|pending|waiting|question/i.test(`${a.prompt || ''} ${a.structure || ''} ${a.text || ''}`))
  return {
    unresolvedThreads: Array.from(new Set(unresolvedArtifacts.map((a) => a.threadId))),
    unansweredQuestions: unresolvedArtifacts.map((a) => a.prompt || '').filter(Boolean).slice(0, 12),
    stalledProjects: Array.from(new Set(unresolvedArtifacts.flatMap((a) => a.projects ?? []))),
    incompleteArtifacts: unresolvedArtifacts.map((a) => a.id),
    pendingLineageChains: Array.from(new Set(unresolvedArtifacts.map((a) => a.lineageId).filter(Boolean) as string[])),
  }
}
