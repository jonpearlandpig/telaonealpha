'use client'

import { useState } from 'react'
import type { ContinuityIngestionInput, ContinuityIngestionMode } from '@/lib/continuity/normalize-ingestion'

type Option = {
  id: string
  label: string
}

type Props = {
  open: boolean
  ownerName?: string
  people: Option[]
  operations: Option[]
  initialMode?: ContinuityIngestionMode | null
  onClose: () => void
  onSubmit: (input: ContinuityIngestionInput) => void
  onVoiceNote?: () => void
}

const QUICK_TAGS = ['handoff', 'note', 'risk', 'approval']

const INGEST_OPTIONS: Array<{
  id: ContinuityIngestionMode
  label: string
  eyebrow: string
  description: string
}> = [
  { id: 'voice-note', label: 'Voice Note', eyebrow: 'Immediate', description: 'Capture spoken continuity without leaving the field.' },
  { id: 'quick-update', label: 'Quick Update', eyebrow: 'Fastest', description: 'Log what changed, what matters, and what needs movement.' },
  { id: 'upload-files', label: 'Upload Files', eyebrow: 'Artifacts', description: 'Stage docs into continuity as traced operational objects.' },
  { id: 'paste-notes', label: 'Paste Notes', eyebrow: 'Raw Intake', description: 'Drop messy notes and let continuity hold the thread.' },
  { id: 'add-photos', label: 'Add Photos', eyebrow: 'Visual Field', description: 'Capture photos as operational memory, not loose media.' },
  { id: 'add-link', label: 'Add Link', eyebrow: 'Reference', description: 'Anchor an external thread or source inside continuity.' },
]

export function ContinuityIngest({
  open,
  ownerName,
  people,
  operations,
  initialMode,
  onClose,
  onSubmit,
  onVoiceNote,
}: Props) {
  const [mode, setMode] = useState<ContinuityIngestionMode | null>(initialMode ?? null)
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [owner, setOwner] = useState(ownerName ?? '')
  const [operation, setOperation] = useState('')
  const [linkedEntity, setLinkedEntity] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [linkUrl, setLinkUrl] = useState('')
  const [assetNames, setAssetNames] = useState<string[]>([])
  const [assetContents, setAssetContents] = useState<Array<{ name: string; content: string; type: string }>>([])

  const readFileContents = async (files: File[]) => {
    const results: Array<{ name: string; content: string; type: string }> = []
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const isText = file.type === 'text/plain' || file.type === 'text/markdown' ||
        ext === 'md' || ext === 'txt' || ext === 'markdown'
      const isExtractable = file.type === 'application/pdf' || ext === 'pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx'

      if (isText) {
        try {
          const content = await file.text()
          results.push({ name: file.name, content, type: file.type || 'text/plain' })
        } catch {
          results.push({ name: file.name, content: '', type: file.type })
        }
      } else if (isExtractable) {
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/parse-document', { method: 'POST', body: fd })
          if (res.ok) {
            const json = await res.json() as { text: string; mimeType: string }
            results.push({ name: file.name, content: json.text, type: json.mimeType || file.type })
          } else {
            results.push({ name: file.name, content: '', type: file.type })
          }
        } catch {
          results.push({ name: file.name, content: '', type: file.type })
        }
      } else {
        results.push({ name: file.name, content: '', type: file.type })
      }
    }
    setAssetContents(results)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    )
  }

  const option = INGEST_OPTIONS.find((item) => item.id === mode) ?? null
  const fileLabel = mode === 'add-photos' ? 'Photos' : 'Files'
  const bodyLabel = mode === 'paste-notes' ? 'Pasted Notes' : mode === 'add-link' ? 'Why this matters now' : 'Context'
  const bodyPlaceholder =
    mode === 'paste-notes'
      ? 'Paste the messy field notes, call notes, or copied thread here.'
      : mode === 'add-link'
        ? 'Add the reason this link matters, what changed, or what needs movement.'
        : 'Add the operational thread, blocker, or handoff detail.'

  const canSubmit = Boolean(mode && (headline.trim() || body.trim() || linkUrl.trim() || assetNames.length))

  const submit = () => {
    if (!mode) return

    console.log('[TELA:TRACE] continuity-ingest submit', {
      mode,
      assetNamesCount: assetNames.length,
      assetContentsCount: assetContents.length,
      firstContentPreview: assetContents[0]?.content?.slice(0, 500) ?? null,
    })

    onSubmit({
      mode,
      headline: headline.trim() || undefined,
      body,
      owner,
      operation,
      linkedEntity,
      tags: selectedTags,
      linkUrl,
      assetNames,
      assetContents: assetContents.length > 0 ? assetContents : undefined,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] bg-[rgba(20,18,16,0.28)] backdrop-blur-[6px]" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 mx-auto max-w-sm rounded-t-[30px] border border-[#E8E0D2] bg-[#F7F3EC] px-5 pb-8 pt-5 shadow-[0_-18px_42px_rgba(17,17,17,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#D5CCBD]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Add Continuity</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#171411]">Bring messy reality into continuity.</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAE3D7] text-[#5E5348]"
            aria-label="Close continuity ingest"
          >
            ×
          </button>
        </div>

        {!mode && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {INGEST_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'voice-note') {
                    onClose()
                    onVoiceNote?.()
                    return
                  }
                  setMode(item.id)
                }}
                className="rounded-[22px] border border-[#E0D7C9] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(17,17,17,0.05)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">{item.eyebrow}</p>
                <p className="mt-2 text-[15px] font-semibold text-[#171411]">{item.label}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">{item.description}</p>
              </button>
            ))}
          </div>
        )}

        {mode && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-[18px] border border-[#E5DBCB] bg-white/75 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Continuity Mode</p>
                <p className="mt-1 text-[14px] font-semibold text-[#171411]">{option?.label}</p>
              </div>
              <button type="button" onClick={() => setMode(null)} className="text-[12px] font-medium text-[#6B5D4B]">
                Change
              </button>
            </div>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Headline</span>
              <input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder={mode === 'add-link' ? 'Name the thread or source' : 'What changed in the field?'}
                className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none placeholder:text-[#A69987]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">{bodyLabel}</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={bodyPlaceholder}
                className="min-h-[112px] w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none placeholder:text-[#A69987]"
              />
            </label>

            {(mode === 'upload-files' || mode === 'add-photos') && (
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">{fileLabel}</span>
                <input
                  type="file"
                  multiple
                  accept={mode === 'add-photos' ? 'image/*' : undefined}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? [])
                    setAssetNames(files.map(f => f.name))
                    void readFileContents(files)
                  }}
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[13px] text-[#171411] file:mr-3 file:rounded-full file:border-0 file:bg-[#171411] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#F6EFDF]"
                />
                {assetNames.length > 0 && <p className="mt-2 text-[12px] text-[#6B5D4B]">{assetNames.length} item{assetNames.length === 1 ? '' : 's'} staged into continuity.</p>}
              </label>
            )}

            {mode === 'add-link' && (
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Link</span>
                <input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://"
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none placeholder:text-[#A69987]"
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Owner</span>
                <select
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none"
                >
                  <option value="">Unassigned</option>
                  {ownerName ? <option value={ownerName}>{ownerName}</option> : null}
                  {people.map((person) => (
                    <option key={person.id} value={person.label}>{person.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Crusade</span>
                <select
                  value={operation}
                  onChange={(event) => setOperation(event.target.value)}
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none"
                >
                  <option value="">General</option>
                  {operations.map((item) => (
                    <option key={item.id} value={item.label}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Linked Entity</span>
                <select
                  value={linkedEntity}
                  onChange={(event) => setLinkedEntity(event.target.value)}
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none"
                >
                  <option value="">No direct entity link</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.label}>{person.label}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Signal</span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition"
                        style={{
                          borderColor: active ? '#C89B2F' : '#D8CEBF',
                          backgroundColor: active ? '#F4E6BE' : '#FFFFFF',
                          color: active ? '#6F541A' : '#6B5D4B',
                        }}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[12px] leading-relaxed text-[#7A6D5A]">Every entry captures who, what, when, linked entity, and linked crusade without changing runtime memory paths.</p>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-full bg-[#171411] px-4 py-2.5 text-[13px] font-semibold text-[#F6EFDF] disabled:opacity-45"
          >
            Add Continuity
          </button>
        </div>
      </div>
    </div>
  )
}
