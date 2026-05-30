export type ExtractedPerson = {
  name: string
  role?: string
}

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/

const STOPWORDS = new Set([
  'the', 'and', 'or', 'for', 'with', 'from', 'that', 'this', 'are', 'have',
  'name', 'phone', 'email', 'role', 'title', 'department', 'notes', 'contact',
  'address', 'city', 'state', 'zip', 'fax', 'mobile', 'office', 'updated',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
])

function isLikelyName(candidate: string): boolean {
  const words = candidate.trim().split(/\s+/)
  if (words.length < 2 || words.length > 4) return false
  const lower = candidate.toLowerCase()
  if (STOPWORDS.has(lower)) return false
  if (words.some(w => STOPWORDS.has(w.toLowerCase()))) return false
  if (words.some(w => /\d/.test(w))) return false
  if (words.some(w => w.length < 2)) return false
  if (!words.every(w => /^[A-Z']/.test(w))) return false
  return true
}

function extractFromMarkdownTable(lines: string[], seen: Set<string>): ExtractedPerson[] {
  const persons: ExtractedPerson[] = []

  // Find header row: a line with multiple | separators containing "Name"
  let nameColIdx = -1
  let roleColIdx = -1
  let headerFound = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    // Skip separator rows like |---|---|
    if (/^\|[-|\s:]+\|/.test(trimmed)) continue

    const cells = trimmed.split('|').map(c => c.trim()).filter((_, i) => i > 0 && _ !== '')
    // Remove trailing empty from split
    if (cells.length < 2) continue

    if (!headerFound) {
      // Detect header row
      const lowerCells = cells.map(c => c.toLowerCase())
      const ni = lowerCells.findIndex(c => c === 'name' || c === 'contact' || c === 'person')
      if (ni !== -1) {
        nameColIdx = ni
        roleColIdx = lowerCells.findIndex(c => c === 'role' || c === 'title' || c === 'position')
        headerFound = true
      }
      continue
    }

    // Data row
    if (nameColIdx === -1 || nameColIdx >= cells.length) continue
    const name = cells[nameColIdx]
    if (!name || !isLikelyName(name) || seen.has(name.toLowerCase())) continue

    seen.add(name.toLowerCase())
    const role = roleColIdx !== -1 && roleColIdx < cells.length ? cells[roleColIdx] : undefined
    persons.push({ name, role: role?.length ? role : undefined })
  }

  return persons
}

export function extractPersonsFromAnchorDirectory(content: string): ExtractedPerson[] {
  const seen = new Set<string>()
  const persons: ExtractedPerson[] = []
  const lines = content.split('\n')

  // Detect markdown table format: majority of non-empty lines start with '|'
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  const pipeLines = nonEmpty.filter(l => l.trim().startsWith('|'))
  if (pipeLines.length > nonEmpty.length / 2) {
    return extractFromMarkdownTable(lines, seen)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.length < 4) continue

    // Pipe / tab / comma delimited: "Name | Role | ..."
    const pipeMatch = line.match(/^([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,3})\s*[|,\t](.*)/)
    if (pipeMatch) {
      const name = pipeMatch[1].trim()
      const rest = pipeMatch[2] ?? ''
      if (isLikelyName(name) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        const roleMatch = rest.match(/^([^|,\t@\d]{3,40}?)(?:\s*[|,\t]|$)/)
        const role = roleMatch?.[1]?.trim() || undefined
        persons.push({ name, role: role?.length ? role : undefined })
      }
      continue
    }

    // Standalone capitalized name line — look for contact info nearby
    if (/^[A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,3}\s*$/.test(line)) {
      const name = line.trim()
      if (isLikelyName(name) && !seen.has(name.toLowerCase())) {
        const context = lines.slice(Math.max(0, i - 1), i + 4).join(' ')
        if (EMAIL_RE.test(context) || PHONE_RE.test(context)) {
          seen.add(name.toLowerCase())
          persons.push({ name })
        }
      }
    }
  }

  return persons
}
