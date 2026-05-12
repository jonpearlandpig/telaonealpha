'use client'

import { useState } from 'react'
import { StatusDot } from './StatusDot'
import { HHO_LIST } from '@/lib/constants'

type HHOStatus = 'active' | 'warm' | 'pending' | 'paused'

const CATEGORY_LABELS: Record<string, string> = {
  project: 'Projects',
  relationship: 'Relationships',
  system: 'Systems',
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span style={{
      display: 'block',
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 11,
      color: 'rgba(234,224,210,0.3)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: 24,
    }}>
      {children}
    </span>
  )
}

export function HHOPanel() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [summaries, setSummaries] = useState<Record<number, string>>({})

  async function loadSummary(id: number, notionId: string) {
    if (expanded === id) { setExpanded(null); return }

    if (summaries[id]) { setExpanded(id); return }

    setLoadingId(id)
    try {
      const res = await fetch(`/api/hho?pageId=${notionId}`)
      const data = await res.json()
      setSummaries((s) => ({ ...s, [id]: data.text || 'No content found.' }))
    } catch {
      setSummaries((s) => ({ ...s, [id]: 'Failed to load — check Notion connection.' }))
    } finally {
      setLoadingId(null)
      setExpanded(id)
    }
  }

  const categories = ['project', 'relationship', 'system'] as const

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 11,
          color: 'rgba(234,224,210,0.3)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: 8,
        }}>
          Pig Pen
        </span>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28,
          fontWeight: 300,
          color: '#EAE0D2',
          letterSpacing: '0.05em',
        }}>
          HHO Registry
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(234,224,210,0.3)', marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
          {HHO_LIST.length} documents · Pig Pen v5.2
        </p>
      </div>

      {categories.map((cat) => {
        const items = HHO_LIST.filter((h) => h.category === cat)
        if (!items.length) return null
        return (
          <div key={cat}>
            <SectionLabel>{CATEGORY_LABELS[cat]}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map((hho) => {
                const isExpanded = expanded === hho.id
                const isLoading = loadingId === hho.id

                return (
                  <div key={hho.id}>
                    <div
                      className="tela-card"
                      style={{ padding: '13px 16px', cursor: 'pointer' }}
                      onClick={() => loadSummary(hho.id, hho.notionId)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <StatusDot status={hho.status as HHOStatus} size={7} />

                        <span style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 16,
                          fontWeight: 500,
                          color: '#EAE0D2',
                          flex: 1,
                        }}>
                          {hho.name}
                        </span>

                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 10,
                          color: 'rgba(234,224,210,0.25)',
                          letterSpacing: '0.05em',
                        }}>
                          {hho.version}
                        </span>

                        <a
                          href={`https://notion.so/${hho.notionId.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: '#C4973A',
                            fontSize: 11,
                            fontFamily: "'DM Sans', sans-serif",
                            textDecoration: 'none',
                            letterSpacing: '0.05em',
                            padding: '3px 8px',
                            border: '1px solid rgba(196,151,58,0.2)',
                          }}
                        >
                          ↗ Open
                        </a>

                        <span style={{ color: 'rgba(234,224,210,0.2)', fontSize: 11 }}>
                          {isLoading ? '…' : isExpanded ? '↑' : '↓'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && summaries[hho.id] && (
                      <div style={{
                        borderLeft: '2px solid #C4973A',
                        marginLeft: 16,
                        padding: '14px 20px',
                        background: 'rgba(196,151,58,0.03)',
                        borderBottom: '1px solid rgba(234,224,210,0.06)',
                      }}>
                        <pre style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          color: 'rgba(234,224,210,0.6)',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0,
                        }}>
                          {summaries[hho.id]}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
