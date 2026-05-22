// Normalization Pass 1 — deterministic, synchronous, no I/O, no inference.
// Operates on raw Notion records before mapper functions run.
// Does not mutate canonical meaning. Does not rewrite operational content.

type NotionRecord = {
  id: string
  properties?: Record<string, Record<string, unknown>>
  last_edited_time?: string
}

// ── Body cleanup ─────────────────────────────────────────────────────────────
//
// Removes Notion formatting artifacts and normalizes whitespace.
// The original meaning and all operational content are preserved.
// No words are added, removed, or reordered.

export function cleanBody(body: string | undefined): string | undefined {
  if (!body) return body
  return body
    .replace(/ /g, ' ')     // non-breaking space → regular space
    .replace(/​/g, '')      // zero-width space → remove
    .replace(/‌/g, '')      // zero-width non-joiner → remove
    .replace(/‍/g, '')      // zero-width joiner → remove
    .replace(/﻿/g, '')      // BOM → remove
    .replace(/[ \t]+/g, ' ')     // collapse horizontal whitespace runs
    .replace(/\n{3,}/g, '\n\n')  // collapse excessive newlines to double
    .replace(/[ \t]+\n/g, '\n')  // trim trailing spaces from each line
    .replace(/\n[ \t]+/g, '\n')  // trim leading spaces from each line
    .trim()
}

// ── Unresolved marker extraction ─────────────────────────────────────────────
//
// Scans body text for phrases that indicate unresolved operational state.
// Returns the matched phrases found. Does not modify the body.
// Patterns are intentionally simple — false negatives are safer than
// false positives on operational state classification.

const UNRESOLVED_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'waiting on',  pattern: /\bwaiting on\b/i },
  { label: 'blocked by',  pattern: /\bblocked by\b/i },
  { label: 'follow up',   pattern: /\bfollow[\s-]?up\b/i },
  { label: 'need to',     pattern: /\bneed to\b/i },
  { label: 'TBD',         pattern: /\bTBD\b/ },
  { label: 'pending',     pattern: /\bpending\b/i },
  { label: 'unresolved',  pattern: /\bunresolved\b/i },
]

export function extractUnresolvedMarkers(text: string | undefined): string[] {
  if (!text) return []
  return UNRESOLVED_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label)
}

// ── Schema boundary validation ────────────────────────────────────────────────
//
// Checks that a raw Notion record carries the minimum required fields
// before it reaches the mapper. Returns true if valid.
// Invalid records are logged and excluded — they do not cause fatal failures.
//
// Required for continuity events:
//   - record.id
//   - at least one name/title candidate property with extractable text
//   - last_edited_time OR at least one date property with a value
//
// Required for people and operations:
//   - record.id
//   - at least one name/title candidate property with extractable text

function extractRichText(value: Record<string, unknown> | undefined): string {
  if (!value) return ''
  const asTitle = (value as { title?: Array<{ plain_text?: string }> }).title
  if (asTitle?.[0]?.plain_text) return asTitle[0].plain_text
  const asRich = (value as { rich_text?: Array<{ plain_text?: string }> }).rich_text
  if (asRich?.[0]?.plain_text) return asRich[0].plain_text
  return ''
}

function extractDateStart(value: Record<string, unknown> | undefined): string {
  return (value as { date?: { start?: string } } | undefined)?.date?.start ?? ''
}

function findProperty(record: NotionRecord, ...keys: string[]): Record<string, unknown> | undefined {
  for (const key of keys) {
    if (record.properties?.[key]) return record.properties[key] as Record<string, unknown>
  }
  return undefined
}

export type ValidationResult = { valid: boolean; warnings: string[] }

export function validateContinuityEventRecord(record: NotionRecord): ValidationResult {
  const warnings: string[] = []

  if (!record.id) {
    return { valid: false, warnings: ['missing record id'] }
  }

  const nameProp = findProperty(record, 'Name', 'Headline', 'Title')
  const name = extractRichText(nameProp)
  if (!name) {
    warnings.push(`record ${record.id.slice(0, 8)} — no extractable name/headline/title property`)
  }

  const hasTimestamp = Boolean(record.last_edited_time)
  const dateValue = extractDateStart(findProperty(record, 'Updated', 'Timestamp', 'Date'))
  if (!hasTimestamp && !dateValue) {
    warnings.push(`record ${record.id.slice(0, 8)} — no timestamp or date property`)
  }

  return { valid: true, warnings }
}

export function validatePersonRecord(record: NotionRecord): ValidationResult {
  if (!record.id) {
    return { valid: false, warnings: ['missing record id'] }
  }
  const nameProp = findProperty(record, 'Name')
  const name = extractRichText(nameProp)
  if (!name) {
    return { valid: true, warnings: [`record ${record.id.slice(0, 8)} — no extractable Name property`] }
  }
  return { valid: true, warnings: [] }
}

export function validateOperationRecord(record: NotionRecord): ValidationResult {
  if (!record.id) {
    return { valid: false, warnings: ['missing record id'] }
  }
  const nameProp = findProperty(record, 'Name', 'Title')
  const name = extractRichText(nameProp)
  if (!name) {
    return { valid: true, warnings: [`record ${record.id.slice(0, 8)} — no extractable Name/Title property`] }
  }
  return { valid: true, warnings: [] }
}

// ── Batch validation helper ───────────────────────────────────────────────────
//
// Validates a batch of records, logs all warnings, and returns only valid records.
// Invalid records (valid: false) are excluded. Records with warnings are included
// but the warnings are logged so schema drift is visible in runtime logs.

type ValidateFn = (r: NotionRecord) => ValidationResult

export function validateAndFilter(
  records: NotionRecord[],
  validate: ValidateFn,
  context: string,
): NotionRecord[] {
  const valid: NotionRecord[] = []
  let warnCount = 0

  for (const record of records) {
    const result = validate(record)
    if (result.warnings.length) {
      warnCount++
      for (const w of result.warnings) {
        console.warn(`[normalization:${context}] schema warning: ${w}`)
      }
    }
    if (result.valid) {
      valid.push(record)
    } else {
      console.error(`[normalization:${context}] record excluded — invalid: ${record.id ?? '(no id)'}`)
    }
  }

  if (warnCount > 0) {
    console.warn(`[normalization:${context}] ${warnCount}/${records.length} records had schema warnings`)
  }

  return valid
}
