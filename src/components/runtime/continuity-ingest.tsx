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
  onSubmit: (input: ContinuityIngestionInput) => boolean | Promise<boolean>
  onVoiceNote?: () => void
}

const QUICK_TAGS = ['handoff', 'note', 'risk', 'approval']
const FILE_ACCEPT = '.pdf,.txt,.md,.markdown,text/plain,text/markdown,application/pdf'

function fileExtractionLabel(status?: string) {
  if (status === 'extracted') return 'Extracted successfully'
  if (status === 'stored-only') return 'Stored only'
  if (status === 'failed') return 'Extraction failed'
  return 'Pending'
}

function fileExtractionTone(status?: string) {
  if (status === 'extracted') return 'border-[#C9DDBF] bg-[#F2F7EF] text-[#344A2A]'
  if (status === 'failed') return 'border-[#E4B0A4] bg-[#FFF0ED] text-[#8B2D1F]'
  return 'border-[#E6D4A7] bg-[#FFF7E8] text-[#7A4F09]'
}

const INGEST_OPTIONS: Array<{
  id: ContinuityIngestionMode
  label: string
  eyebrow: string
  description: string
}> = [
      { id: 'voice-note', label: 'Voice Note', eyebrow: 'Immediate', description: 'Capture a spoken update without leaving the screen.' },
      { id: 'quick-update', label: 'Quick Update', eyebrow: 'Fastest', description: 'Log what changed, what matters, and what needs movement.' },
      { id: 'upload-files', label: 'Upload Files', eyebrow: 'Files', description: 'Add docs and keep their source attached.' },
      { id: 'paste-notes', label: 'Paste Notes', eyebrow: 'Raw Intake', description: 'Drop messy notes and keep them with the right thread.' },
      { id: 'add-photos', label: 'Add Photos', eyebrow: 'Visual Notes', description: 'Add photos as useful context, not loose media.' },
      { id: 'add-link', label: 'Add Link', eyebrow: 'Reference', description: 'Save an external thread or source with this work.' },
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
  const [assetContents, setAssetContents] = useState<Array<{ name: string; content: string; type: string; extractionStatus?: 'extracted' | 'stored-only' | 'failed'; extractionDetail?: string }>>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const readFileContents = async (files: File[]) => {
    const results: Array<{ name: string; content: string; type: string; extractionStatus?: 'extracted' | 'stored-only' | 'failed'; extractionDetail?: string }> = []
    for (const file of files) {
      const isText = file.type === 'text/plain' || file.type === 'text/markdown' ||
        file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.markdown')
      if (isText) {
        try {
          const content = await file.text()
          results.push({
            name: file.name,
            content,
            type: file.type || 'text/plain',
            extractionStatus: content.trim() ? 'extracted' : 'failed',
            extractionDetail: content.trim() ? 'Text was saved with this update.' : 'The file was empty or unreadable.',
          })
        } catch {
          results.push({
            name: file.name,
            content: '',
            type: file.type,
            extractionStatus: 'failed',
            extractionDetail: 'ShowTELA could not read this text file.',
          })
        }
      } else {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        results.push({
          name: file.name,
          content: '',
          type: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
          extractionStatus: isPdf ? 'stored-only' : 'failed',
          extractionDetail: isPdf
            ? 'PDF is saved as a source file; detailed venue parsing runs separately.'
            : 'Only PDF, TXT, and MD files are supported.',
        })
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

  const submit = async () => {
    if (!mode) return
    setSubmitError(null)

    console.log('[TELA:TRACE] continuity-ingest submit', {
      mode,
      assetNamesCount: assetNames.length,
      assetContentsCount: assetContents.length,
      firstContentPreview: assetContents[0]?.content?.slice(0, 500) ?? null,
    })

    const ok = await onSubmit({
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
    if (ok) onClose()
    else setSubmitError('Update failed. File statuses above were not stored.')
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Add Update</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#171411]">Capture what changed.</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAE3D7] text-[#5E5348]"
            aria-label="Close update form"
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Update Type</p>
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
                  accept={mode === 'add-photos' ? 'image/*' : FILE_ACCEPT}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? [])
                    setAssetNames(files.map(f => f.name))
                    void readFileContents(files)
                  }}
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[13px] text-[#171411] file:mr-3 file:rounded-full file:border-0 file:bg-[#171411] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#F6EFDF]"
                />
                {assetNames.length > 0 && <p className="mt-2 text-[12px] text-[#6B5D4B]">{assetNames.length} item{assetNames.length === 1 ? '' : 's'} ready to save.</p>}
                {assetContents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {assetContents.map((asset) => (
                      <div key={asset.name} className={`rounded-[14px] border px-3 py-2 ${fileExtractionTone(asset.extractionStatus)}`}>
                        <p className="text-[12px] font-semibold">{asset.name}</p>
                        <p className="mt-1 text-[11px] leading-relaxed">{fileExtractionLabel(asset.extractionStatus)}. {asset.extractionDetail}</p>
                      </div>
                    ))}
                  </div>
                )}
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

            {submitError && (
              <p className="rounded-[14px] border border-[#E4B0A4] bg-[#FFF0ED] px-3 py-2 text-[12px] font-medium text-[#8B2D1F]">
                {submitError}
              </p>
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
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">Linked Person</span>
                <select
                  value={linkedEntity}
                  onChange={(event) => setLinkedEntity(event.target.value)}
                  className="w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[14px] text-[#171411] outline-none"
                >
                  <option value="">No direct person link</option>
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
          <p className="text-[12px] leading-relaxed text-[#7A6D5A]">Every entry captures who, what, when, linked person, and linked project without changing how ShowTELA stores it.</p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="rounded-full bg-[#171411] px-4 py-2.5 text-[13px] font-semibold text-[#F6EFDF] disabled:opacity-45"
          >
            Add Update
          </button>
        </div>
      </div>
    </div>
  )
}
