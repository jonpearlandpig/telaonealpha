import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export type RankedArtifact = { artifact: ArtifactRecord; score: number; reasons: string[] }

export function rankByProvenance(artifacts: ArtifactRecord[], nowMs = Date.now()): RankedArtifact[] {
  return artifacts.map((artifact) => {
    const reasons: string[] = []
    let score = 0
    if (artifact.lineageId) { score += 18; reasons.push('lineage') }
    if (artifact.pinned) { score += 15; reasons.push('authority') }
    if (artifact.artifactGroupId) { score += 8; reasons.push('continuity-persistence') }
    if (/notion|pearl|runtime/i.test(`${artifact.projects?.join(' ') || ''} ${artifact.prompt || ''}`)) { score += 9; reasons.push('canonical-source') }
    if (/unresolved|todo|follow-up|pending|waiting/i.test(`${artifact.prompt || ''} ${artifact.structure || ''} ${artifact.text || ''}`)) { score += 14; reasons.push('unresolved') }
    const ageHours = Math.max(1, (nowMs - new Date(artifact.createdAt).getTime()) / 3600000)
    score += Math.max(0, 12 - ageHours / 12); reasons.push('temporal')
    if (artifact.threadId) { score += 6; reasons.push('operational-relevance') }
    return { artifact, score, reasons }
  }).sort((a, b) => b.score - a.score)
}
