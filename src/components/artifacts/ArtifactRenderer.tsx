'use client'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export function ArtifactRenderer({ artifact }: { artifact: ArtifactRecord }) {
  if (artifact.previewUrl) {
    return <iframe title={artifact.title} src={artifact.previewUrl} style={{ width: '100%', height: 240, border: 0, borderRadius: 10, background: '#081321' }} />
  }
  if (artifact.html) {
    return <iframe title={artifact.title} srcDoc={artifact.html} style={{ width: '100%', height: 240, border: 0, borderRadius: 10, background: '#081321' }} sandbox="allow-scripts" />
  }
  return <div style={{ minHeight: 140, border: '1px solid rgba(196,151,58,0.22)', borderRadius: 10, padding: 14, color: '#EAE0D2' }}>{artifact.structure || 'No preview available.'}</div>
}
