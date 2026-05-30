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

export function extractPersonsFromAnchorDirectory(content: string): ExtractedPerson[] {
  const seen = new Set<string>()
  const persons: ExtractedPerson[] = []
  const lines = content.split('\n')

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
