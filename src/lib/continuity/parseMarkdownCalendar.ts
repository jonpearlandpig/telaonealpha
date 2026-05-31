export type ParsedCalendarEvent = {
  id: string
  title: string
  isoTimestamp: string
  location?: string
  department: string
  owner?: string
}

export type ParsedCalendar = {
  title: string
  events: ParsedCalendarEvent[]
  departments: string[]
}

function cleanText(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeSection(value: string) {
  return cleanText(value)
    .replace(/^#+\s+/, '')
    .replace(/\s+v\d+(\.\d+)?$/i, '')
    .trim()
}

function parseDateCell(value: string): { month: number; day: number; year: number } | null {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
  if (!month || !day || !year) return null
  return { month, day, year }
}

function parseTimeCell(value: string): { hour: number; minute: number } | null {
  const cleaned = cleanText(value)
  if (!cleaned || cleaned === '—' || cleaned.toUpperCase() === 'OFF') return { hour: 12, minute: 0 }
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let hour = Number(match[1]) % 12
  const minute = Number(match[2])
  if (match[3].toUpperCase() === 'PM') hour += 12
  return { hour, minute }
}

function toIsoTimestamp(dateCell: string, timeCell?: string) {
  const date = parseDateCell(dateCell)
  if (!date) return null
  const time = parseTimeCell(timeCell ?? '') ?? { hour: 12, minute: 0 }
  return new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute)).toISOString()
}

function eventTitle(cells: string[], indexes: { event: number; city: number; venue: number }) {
  const event = indexes.event >= 0 ? cleanText(cells[indexes.event] ?? '') : ''
  if (event) return event
  const city = indexes.city >= 0 ? cleanText(cells[indexes.city] ?? '') : ''
  const venue = indexes.venue >= 0 ? cleanText(cells[indexes.venue] ?? '') : ''
  return [city, venue].filter(Boolean).join(' — ')
}

export function parseMarkdownCalendar(text: string): ParsedCalendar {
  const lines = text.split('\n')
  const events: ParsedCalendarEvent[] = []
  const departments: string[] = []
  let title = ''
  let currentSection = 'Calendar'
  let inTable = false
  let indexes = { date: -1, time: -1, event: -1, location: -1, city: -1, venue: -1, owner: -1 }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('# ')) {
      const heading = normalizeSection(trimmed.slice(2))
      if (!title) {
        title = heading
        continue
      }

      currentSection = heading || currentSection
      if (heading && !departments.includes(heading)) departments.push(heading)
      inTable = false
      indexes = { date: -1, time: -1, event: -1, location: -1, city: -1, venue: -1, owner: -1 }
      continue
    }

    if (/^#{2,3}\s/.test(trimmed)) {
      currentSection = normalizeSection(trimmed)
      if (currentSection && !departments.includes(currentSection)) departments.push(currentSection)
      inTable = false
      indexes = { date: -1, time: -1, event: -1, location: -1, city: -1, venue: -1, owner: -1 }
      continue
    }

    if (!trimmed.startsWith('|')) {
      inTable = false
      continue
    }

    const cells = trimmed.split('|').map(cell => cleanText(cell)).filter(Boolean)
    if (cells.length === 0 || cells.every(cell => /^[-:]+$/.test(cell))) continue

    if (!inTable) {
      const headers = cells.map(cell => cell.toLowerCase())
      indexes = {
        date: headers.findIndex(header => header === 'date'),
        time: headers.findIndex(header => header === 'time'),
        event: headers.findIndex(header => header.includes('event')),
        location: headers.findIndex(header => header.includes('location') || header.includes('load in') || header.includes('show time') || header.includes('load out')),
        city: headers.findIndex(header => header.includes('city')),
        venue: headers.findIndex(header => header.includes('venue')),
        owner: headers.findIndex(header => header.includes('runtime owner') || header.includes('owner')),
      }
      inTable = true
      continue
    }

    const dateCell = indexes.date >= 0 ? cells[indexes.date] ?? '' : ''
    const timeCell = indexes.time >= 0 ? cells[indexes.time] ?? '' : ''
    const isoTimestamp = toIsoTimestamp(dateCell, timeCell)
    if (!isoTimestamp) continue

    const titleText = eventTitle(cells, indexes)
    if (!titleText) continue

    const locationParts = [
      indexes.location >= 0 ? cells[indexes.location] : '',
      indexes.city >= 0 ? cells[indexes.city] : '',
      indexes.venue >= 0 ? cells[indexes.venue] : '',
    ].map(cleanText).filter(Boolean)

    const owner = indexes.owner >= 0 ? cleanText(cells[indexes.owner] ?? '') : ''
    events.push({
      id: `calendar-${slugify(`${currentSection}-${dateCell}-${titleText}`)}`,
      title: titleText,
      isoTimestamp,
      location: locationParts.join(' · ') || undefined,
      department: currentSection,
      owner: owner || undefined,
    })
  }

  return {
    title: title || 'Calendar',
    events,
    departments: Array.from(new Set(departments)),
  }
}
