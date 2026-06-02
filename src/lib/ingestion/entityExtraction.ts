export type IngestedEntity = {
  id: string
  name: string
  type: 'person' | 'project' | 'system' | 'artifact' | 'thread'
  role?: string          // ← NEW: captures "Tour Director", "FOH Engineer", etc.
  relatedEntities: string[]
  relatedArtifacts: string[]
  relatedThreads: string[]
}

// Matches "Role: Name", "Role — Name", "Role – Name", "Role - Name"
// and table rows "| Role | Name |"
const ROLE_MAPPING_PATTERNS = [
  // Bullet / inline: "Tour Director: Trey Mills" or "Tour Director — Trey Mills"
  /^[-*]?\s*([A-Za-z \/&]+?)\s*(?::|—|–|-)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s*$/gm,
  // Table row: "| Tour Director | Trey Mills |"
  /\|\s*([A-Za-z \/&]+?)\s*\|\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s*\|/gm,
]

export function extractIngestionEntities(
  text: string,
  artifactId?: string,
  threadId?: string,
): IngestedEntity[] {
  const out: IngestedEntity[] = []

  const push = (
    name: string,
    type: IngestedEntity['type'],
    role?: string,
  ) => {
    const id = `${type}:${name.toLowerCase().replace(/\s+/g, '-')}`
    const existing = out.find((e) => e.id === id)
    if (existing) {
      // Upgrade with role if we now have one
      if (role && !existing.role) existing.role = role
      return
    }
    out.push({
      id,
      name,
      type,
      role,
      relatedEntities: [],
      relatedArtifacts: artifactId ? [artifactId] : [],
      relatedThreads: threadId ? [threadId] : [],
    })
  }

  // ── 1. Role-mapped persons (highest signal) ──────────────────────────────
  // These fire first so names get role context before the plain regex runs
  for (const pattern of ROLE_MAPPING_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const role = match[1]?.trim()
      const name = match[2]?.trim()
      if (role && name && name.length > 2) {
        push(name, 'person', role)
      }
    }
  }

  // ── 2. Plain capitalized names (lower signal, fills gaps) ────────────────
  const personMatches = text.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g) ?? []
  personMatches.slice(0, 12).forEach((n) => push(n, 'person'))

  // ── 3. Projects and systems ───────────────────────────────────────────────
  const projectMatches = text.match(/\b(crusade|flightpath|tourtext|teladex)\b/gi) ?? []
  const systemMatches  = text.match(/\b(TELA|AKB|Notion|Pearl Box|Runtime)\b/gi) ?? []
  projectMatches.slice(0, 8).forEach((n) => push(n, 'project'))
  systemMatches.slice(0, 8).forEach((n) => push(n, 'system'))

  return out
}
