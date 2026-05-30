export type ExtractedShowDate = {
  isoDate: string
  venue?: string
  city?: string
  state?: string
  rawLine?: string
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

function parseIso(month: string, day: string, year?: string): string | null {
  const m = MONTHS[month.toLowerCase()]
  if (!m) return null
  const d = parseInt(day, 10)
  const y = year ? parseInt(year, 10) : new Date().getFullYear()
  if (isNaN(d) || isNaN(y) || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T20:00:00.000Z`
}

export function extractShowDatesFromCalendar(content: string): ExtractedShowDate[] {
  const results: ExtractedShowDate[] = []
  const seen = new Set<string>()

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.length < 5) continue

    let isoDate: string | null = null

    // "March 15, 2025" or "Mar 15 2025" or "March 15"
    const monthName = line.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?\b/i,
    )
    if (monthName) {
      isoDate = parseIso(monthName[1], monthName[2], monthName[3])
    }

    // "03/15/2025" or "3-15-25"
    if (!isoDate) {
      const numeric = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/)
      if (numeric) {
        const [, m, d, y] = numeric
        const year = y.length === 2 ? `20${y}` : y
        isoDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T20:00:00.000Z`
      }
    }

    if (!isoDate || seen.has(isoDate)) continue
    seen.add(isoDate)

    // Strip date from line to extract venue/city
    const rest = line
      .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:[,\s]+\d{4})?\b/i, '')
      .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, '')
      .replace(/^[\s\-–—|,•·]+/, '')
      .trim()

    const parts = rest.split(/\s*[|–—]\s*|\s*,\s+(?=[A-Z])/).map(p => p.trim()).filter(Boolean)
    const venue = parts[0] || undefined
    let city: string | undefined
    let state: string | undefined

    if (parts[1]) {
      const cityState = parts[1].match(/^(.+?)\s*,?\s*([A-Z]{2})$/)
      if (cityState && US_STATES.has(cityState[2])) {
        city = cityState[1].trim()
        state = cityState[2]
      } else {
        city = parts[1]
        // comma split may have placed the state code into parts[2]
        if (parts[2] && /^[A-Z]{2}$/.test(parts[2].trim()) && US_STATES.has(parts[2].trim())) {
          state = parts[2].trim()
        }
      }
    }

    results.push({ isoDate, venue, city, state, rawLine: line })
  }

  return results.sort((a, b) => a.isoDate.localeCompare(b.isoDate))
}
