'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RolodexCard, type RolodexCardProps } from '@/components/RolodexCard'
import { CardDetail } from '@/components/CardDetail'
import { HHO_LIST } from '@/lib/constants'
import type { SyncPayload } from '@/lib/notion'

type Domain = 'people' | 'projects' | 'threads' | 'life' | 'work'

type BrowseScreenProps = {
  syncData: SyncPayload | null
}

const DOMAIN_TABS: { id: Domain; label: string }[] = [
  { id: 'people', label: 'PEOPLE' },
  { id: 'projects', label: 'PROJECTS' },
  { id: 'threads', label: 'THREADS' },
  { id: 'life', label: 'LIFE' },
  { id: 'work', label: 'WORK' },
]

const PEOPLE_CARDS: RolodexCardProps[] = [
  {
    id: 'ppl-001',
    systemLabel: 'PEOPLE — PEARL & PIG',
    tid: 'PPL-00217',
    title: 'John Bowers',
    statusLabel: 'Active Thread',
    status: 'attention',
    leftCol: [
      { label: 'Org', value: 'Thompson Burton' },
      { label: 'Focus', value: 'AI implementation' },
    ],
    rightCol: [
      { label: 'Last Contact', value: 'Bible study Mon 5/11/26' },
      { label: 'Expecting', value: 'Follow-up' },
    ],
  },
  {
    id: 'ppl-002',
    systemLabel: 'PEOPLE — PEARL & PIG',
    tid: 'PPL-00218',
    title: 'Tim Womble',
    statusLabel: 'Conversation Active',
    status: 'live',
    leftCol: [
      { label: 'Org', value: 'Elevation Church' },
      { label: 'Project', value: 'One More Question' },
    ],
    rightCol: [
      { label: 'Role', value: 'Creative Director' },
      { label: 'Status', value: 'In conversation' },
    ],
  },
  {
    id: 'ppl-003',
    systemLabel: 'PEOPLE — PEARL & PIG',
    tid: 'PPL-00219',
    title: 'Ken & Susan Ferguson',
    statusLabel: 'Reply Incoming',
    status: 'upcoming',
    leftCol: [
      { label: 'Org', value: 'Alive Fest' },
      { label: 'Action', value: 'Outreach sent' },
    ],
    rightCol: [
      { label: 'Status', value: 'Awaiting reply' },
      { label: 'Type', value: 'Outreach' },
    ],
  },
  {
    id: 'ppl-004',
    systemLabel: 'PEOPLE — PEARL & PIG',
    tid: 'PPL-00220',
    title: 'Caleb Cook',
    statusLabel: 'On Pause',
    status: 'hold',
    leftCol: [
      { label: 'Org', value: 'Breit Group' },
      { label: 'Role', value: 'Producer role' },
    ],
    rightCol: [
      { label: 'Status', value: 'On pause' },
      { label: 'Priority', value: 'Hold' },
    ],
  },
  {
    id: 'ppl-005',
    systemLabel: 'PEOPLE — PEARL & PIG',
    tid: 'PPL-00221',
    title: 'Juan Otero',
    statusLabel: 'Moved to Hold',
    status: 'hold',
    leftCol: [
      { label: 'Project', value: 'Crusade creator' },
      { label: 'Last Action', value: 'Call happened' },
    ],
    rightCol: [
      { label: 'Status', value: 'Hold' },
      { label: 'Next', value: 'TBD' },
    ],
  },
]

function hhoStatusToCardStatus(status: string): RolodexCardProps['status'] {
  if (status === 'active') return 'live'
  if (status === 'warm') return 'upcoming'
  if (status === 'paused') return 'hold'
  return 'hold'
}

function buildProjectCards(): RolodexCardProps[] {
  return HHO_LIST.filter((h) => h.category === 'project').map((h) => ({
    id: `proj-${h.id}`,
    systemLabel: 'PROJECTS — PEARL & PIG',
    tid: `PRJ-${String(h.id).padStart(5, '0')}`,
    title: h.name,
    statusLabel: h.status.charAt(0).toUpperCase() + h.status.slice(1),
    status: hhoStatusToCardStatus(h.status),
    leftCol: [
      { label: 'Version', value: h.version },
      { label: 'Category', value: h.category },
    ],
    rightCol: [
      { label: 'Status', value: h.status },
      { label: 'HHO ID', value: String(h.id) },
    ],
  }))
}

function buildThreadCards(): RolodexCardProps[] {
  return HHO_LIST.filter((h) => h.category === 'relationship').map((h) => ({
    id: `rel-${h.id}`,
    systemLabel: 'THREADS — PEARL & PIG',
    tid: `THR-${String(h.id).padStart(5, '0')}`,
    title: h.name,
    statusLabel: h.status.charAt(0).toUpperCase() + h.status.slice(1),
    status: hhoStatusToCardStatus(h.status),
    leftCol: [
      { label: 'Version', value: h.version },
      { label: 'Type', value: 'Relationship' },
    ],
    rightCol: [
      { label: 'Status', value: h.status },
      { label: 'HHO ID', value: String(h.id) },
    ],
  }))
}

const PLACEHOLDER_CARDS: RolodexCardProps[] = [
  {
    id: 'placeholder-1',
    systemLabel: 'COMING SOON',
    tid: 'N/A',
    title: 'Coming Soon',
    statusLabel: 'Not yet available',
    status: 'hold',
    leftCol: [{ label: 'Status', value: 'Planned' }],
    rightCol: [{ label: 'ETA', value: 'TBD' }],
  },
]

function getCardsForDomain(domain: Domain): RolodexCardProps[] {
  switch (domain) {
    case 'people':
      return PEOPLE_CARDS
    case 'projects':
      return buildProjectCards()
    case 'threads':
      return buildThreadCards()
    case 'life':
    case 'work':
      return PLACEHOLDER_CARDS
  }
}

export default function BrowseScreen({ syncData: _syncData }: BrowseScreenProps) {
  const [activeDomain, setActiveDomain] = useState<Domain>('people')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  const cards = getCardsForDomain(activeDomain)
  const selectedCardData = cards.find((c) => c.id === selectedCard) ?? null

  function handleTabChange(domain: Domain) {
    setActiveDomain(domain)
    setSelectedCard(null)
  }

  function handleCardTap(cardId: string) {
    setSelectedCard((prev) => (prev === cardId ? null : cardId))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Domain tabs */}
      <div style={{
        display: 'flex',
        height: 44,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        flexShrink: 0,
        WebkitOverflowScrolling: 'touch',
      }}>
        {DOMAIN_TABS.map((tab) => {
          const isActive = activeDomain === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flexShrink: 0,
                padding: '0 18px',
                height: '100%',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--gold-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--gold-light)' : 'var(--text-muted)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'color 0.2s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Card stack */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px 24px',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDomain}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <RolodexCard
                  {...card}
                  isSelected={selectedCard === card.id}
                  onTap={() => handleCardTap(card.id)}
                />
                <AnimatePresence>
                  {selectedCard === card.id && selectedCardData && (
                    <CardDetail
                      key={`detail-${card.id}`}
                      card={selectedCardData}
                      onClose={() => setSelectedCard(null)}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
