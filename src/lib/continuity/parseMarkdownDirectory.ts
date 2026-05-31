export type ParsedPerson = {
  name: string
  role: string
  department: string
}

export type ParsedDirectory = {
  title: string
  people: ParsedPerson[]
  departments: string[]
}

function cleanMarkdown(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

function isPersonName(text: string): boolean {
  if (!text || text.length < 3 || text.length > 60) return false
  const words = text.trim().split(/\s+/)
  if (words.length < 2 || words.length > 5) return false
  return /^[A-Z][a-zA-Z'.-]*(\s+[A-Za-z][a-zA-Z'.-]*)+$/.test(text.trim())
}

function extractPerson(raw: string, department: string): ParsedPerson | null {
  const clean = cleanMarkdown(raw)
  if (!clean) return null

  const separators = [' — ', ' – ', ' - ', ': ']
  for (const sep of separators) {
    const idx = clean.indexOf(sep)
    if (idx > 1) {
      const name = clean.slice(0, idx).trim()
      const roleRaw = clean.slice(idx + sep.length).trim()
      const role = roleRaw.split(/\s*[,/|]\s*/)[0]?.trim() ?? roleRaw
      if (isPersonName(name)) {
        return { name, role, department }
      }
    }
  }

  if (isPersonName(clean)) {
    return { name: clean, role: '', department }
  }

  return null
}

function extractTableRow(
  cells: string[],
  nameCol: number,
  roleCol: number,
  deptCol: number,
  currentDept: string,
): ParsedPerson | null {
  if (nameCol < 0 || nameCol >= cells.length) return null
  const name = cleanMarkdown(cells[nameCol])
  if (!isPersonName(name)) return null
  const role = roleCol >= 0 && roleCol < cells.length ? cells[roleCol].trim() : ''
  const dept = deptCol >= 0 && deptCol < cells.length ? cells[deptCol].trim() : currentDept
  return { name, role, department: dept }
}

export function parseMarkdownDirectory(text: string): ParsedDirectory {
  const lines = text.split('\n')
  const people: ParsedPerson[] = []
  const departments: string[] = []
  const seenNames = new Set<string>()
  let title = ''
  let currentDept = ''
  let inTable = false
  let nameCol = -1
  let roleCol = -1
  let deptCol = -1

  const addPerson = (p: ParsedPerson) => {
    const key = p.name.toLowerCase()
    if (!seenNames.has(key)) {
      seenNames.add(key)
      people.push(p)
    }
  }

  const addDept = (dept: string) => {
    if (dept && !departments.includes(dept)) departments.push(dept)
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    if (trimmed.startsWith('# ')) {
      const heading = trimmed.slice(2).trim()
      if (!title) {
        title = heading
        continue
      }

      currentDept = heading
      addDept(heading)
      inTable = false
      nameCol = -1
      roleCol = -1
      deptCol = -1
      continue
    }

    if (/^#{2,3}\s/.test(trimmed)) {
      const dept = trimmed
        .replace(/^#+\s+/, '')
        .replace(/\s+Department$/i, '')
        .replace(/\s+Team$/i, '')
        .trim()
      if (dept && !dept.startsWith('---')) {
        currentDept = dept
        addDept(dept)
      }
      inTable = false
      nameCol = -1
      roleCol = -1
      deptCol = -1
      continue
    }

    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean)

      if (cells.every(c => /^[-:]+$/.test(c))) continue

      if (!inTable) {
        const headers = cells.map(c => c.toLowerCase())
        nameCol = headers.findIndex(h => h.includes('name'))
        roleCol = headers.findIndex(h => h.includes('role') || h.includes('title') || h.includes('position'))
        deptCol = headers.findIndex(h => h.includes('dept') || h.includes('department') || h.includes('team'))
        inTable = true
        continue
      }

      const p = extractTableRow(cells, nameCol, roleCol, deptCol, currentDept)
      if (p) {
        if (p.department && p.department !== currentDept) addDept(p.department)
        addPerson(p)
      }
      continue
    }

    if (inTable) {
      inTable = false
      nameCol = -1
      roleCol = -1
      deptCol = -1
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2).trim()
      const p = extractPerson(content, currentDept)
      if (p) addPerson(p)
      continue
    }

    if (!trimmed.startsWith('#')) {
      const p = extractPerson(trimmed, currentDept)
      if (p) addPerson(p)
    }
  }

  return {
    title: title || 'Crew Directory',
    people,
    departments,
  }
}
