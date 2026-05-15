'use client'
import { useMemo } from 'react'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

function esc(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
}

export function ArtifactRenderer({ artifact, mode = 'preview' }: { artifact: ArtifactRecord; mode?: 'preview' | 'open' | 'source' }) {
  const markdownDoc = useMemo(() => {
    if (!artifact.markdown) return null
    const body = markdownToHtml(esc(artifact.markdown))
    return `<!doctype html><html><body style="font-family:system-ui;padding:16px;color:#eae0d2;background:#081321"><p>${body}</p></body></html>`
  }, [artifact.markdown])

  if (mode === 'source') {
    const source = artifact.html ?? artifact.markdown ?? artifact.code ?? artifact.text ?? artifact.structure ?? 'No source available.'
    return <pre style={{ minHeight: 160, border: '1px solid rgba(196,151,58,0.22)', borderRadius: 10, padding: 14, color: '#C4973A', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{source}</pre>
  }

  if (artifact.previewUrl) {
    return <iframe title={artifact.title} src={artifact.previewUrl} style={{ width: '100%', height: mode === 'open' ? 420 : 260, border: 0, borderRadius: 10, background: '#081321' }} />
  }
  if (artifact.html) {
    return <iframe title={artifact.title} srcDoc={artifact.html} style={{ width: '100%', height: mode === 'open' ? 420 : 260, border: 0, borderRadius: 10, background: '#081321' }} sandbox="allow-scripts" />
  }
  if (markdownDoc) {
    return <iframe title={artifact.title} srcDoc={markdownDoc} style={{ width: '100%', height: mode === 'open' ? 420 : 260, border: 0, borderRadius: 10, background: '#081321' }} sandbox="allow-same-origin" />
  }
  if (artifact.mimeType === 'application/json' && artifact.text) {
    let formatted = artifact.text
    try {
      formatted = JSON.stringify(JSON.parse(artifact.text), null, 2)
    } catch {
      formatted = artifact.text
    }
    return <pre style={{ minHeight: 140, border: '1px solid rgba(196,151,58,0.22)', borderRadius: 10, padding: 14, color: '#8FD3FF', overflowX: 'auto' }}>{formatted}</pre>
  }
  if (artifact.code) {
    return <pre style={{ minHeight: 140, border: '1px solid rgba(196,151,58,0.22)', borderRadius: 10, padding: 14, color: '#C4973A', overflowX: 'auto' }}><code>{artifact.code}</code></pre>
  }
  return <div style={{ minHeight: 140, border: '1px solid rgba(196,151,58,0.22)', borderRadius: 10, padding: 14, color: '#EAE0D2' }}>{artifact.structure || 'No preview available.'}</div>
}
