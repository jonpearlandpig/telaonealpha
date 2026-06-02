import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function longDateToSlash(raw: string): string | null {
  const m = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (!m) return null
  const month = MONTH_MAP[m[1].toLowerCase()]
  if (!month) return null
  const year = parseInt(m[3]) % 100
  return `${month}/${m[2]}/${year < 10 ? '0' + year : year}`
}

// Fix "Nashville, Tn" → "Nashville, TN" (2-letter state abbreviation)
function fixStateCase(city: string): string {
  return city.replace(/,\s*([A-Za-z]{2})$/, (_, s) => `, ${s.toUpperCase()}`)
}

// Strip quoted nicknames, email/phone artifacts, collapse whitespace
function cleanName(raw: string): string {
  return normalizeWhitespace(
    raw
      .replace(/"[^"]*"/g, '')        // "Pip" → removed
      .replace(/\s+Email\b.*/i, '')   // " Email: ..." → removed
      .replace(/\s+Phone\b.*/i, '')   // " Phone: ..." → removed
  )
}

function extractRoutingMarkdown(text: string): string {
  const rows: string[] = []
  const cityBlocks = text.split(/={10,}/)

  let cityName = ''
  let date = ''
  let venue = ''
  let loadIn = ''
  let showTime = ''

  const flush = () => {
    if (cityName && date && venue) {
      rows.push(`| ${date} | ${cityName} | ${venue} | ${loadIn || '—'} | ${showTime || '—'} |`)
    }
  }

  for (const block of cityBlocks) {
    const normalBlock = normalizeWhitespace(block)

    const cityMatch = normalBlock.match(/CITY\s+\d+\s+[—\-–]+\s+([A-Z][A-Z\s.,]+[A-Z])/)
    if (cityMatch) {
      flush()
      cityName = fixStateCase(
        cityMatch[1].trim()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      )
      date = ''
      venue = ''
      loadIn = ''
      showTime = ''
    }

    const dateMatch = normalBlock.match(/(?:Day &\s*Date|Date)\s*:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/)
    if (dateMatch) {
      date = longDateToSlash(dateMatch[1]) ?? dateMatch[1]
    }

    const venueMatch = normalBlock.match(/Venue\s*:\s*([^|]+?)(?:\s+(?:Venue Mode|Capacity|Union|Low Steel|Dock|Contact)|$)/)
    if (venueMatch) {
      venue = normalizeWhitespace(venueMatch[1])
    }

    const loadInMatch = normalBlock.match(/Load In\s*:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/)
    if (loadInMatch) {
      loadIn = loadInMatch[1].trim()
    }

    const showMatch = normalBlock.match(/Show\s*:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/)
    if (showMatch) {
      showTime = showMatch[1].trim()
    }
  }

  flush()

  if (rows.length === 0) return ''

  // Extract venue promoter contacts (Name | Phone | Email pattern after "Contact:")
  const venueContacts: Array<{ name: string; city: string }> = []
  const contactPattern = /Contact:\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g
  let cm: RegExpExecArray | null
  const blocksCopy = cityBlocks.slice()
  let ccity = ''
  for (const block of blocksCopy) {
    const nb = normalizeWhitespace(block)
    const cm2 = nb.match(/CITY\s+\d+\s+[—\-–]+\s+([A-Z][A-Z\s.,]+[A-Z])/)
    if (cm2) {
      ccity = fixStateCase(cm2[1].trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '))
    }
    while ((cm = contactPattern.exec(nb)) !== null) {
      venueContacts.push({ name: cm[1], city: ccity })
    }
  }

  let output = [
    '# Tour Schedule',
    '',
    '| Date | City | Venue | Load In | Show Time |',
    '|------|------|-------|---------|-----------|',
    ...rows,
  ].join('\n')

  if (venueContacts.length > 0) {
    output += '\n\n## Venue Contacts\n\n| Name | Role | Department |\n|------|------|------------|\n'
    for (const vc of venueContacts) {
      output += `| ${vc.name} | Promoter Contact | Venue Contacts |\n`
    }
  }

  return output
}

function extractContactsMarkdown(text: string): string {
  const sections: string[] = []
  const deptPeople: Record<string, Array<{ name: string; role: string }>> = {}

  let currentDept = 'General'
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = normalizeWhitespace(line)

    // All-caps department header
    if (
      /^[A-Z][A-Z\s\/\-–—]{5,}[A-Z]$/.test(trimmed) &&
      !/\d/.test(trimmed) &&
      !trimmed.startsWith('SECTION')
    ) {
      currentDept = trimmed
      continue
    }

    // "[Role] Name: First [Nick] Last [Email: ...]"
    const personMatch = trimmed.match(
      /^(.+?)\s+Name:\s+([A-Z][a-z]+(?:\s+"[^"]*")?\s+[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/
    )
    if (personMatch) {
      const role = normalizeWhitespace(personMatch[1])
      const rawName = normalizeWhitespace(personMatch[2])
      const name = cleanName(rawName)

      if (role.includes('@') || /\d{3}-\d{3}/.test(role)) continue
      if (!name || name.split(' ').length < 2) continue

      if (!deptPeople[currentDept]) deptPeople[currentDept] = []
      deptPeople[currentDept].push({ name, role })
    }
  }

  for (const [dept, people] of Object.entries(deptPeople)) {
    if (people.length === 0) continue
    const deptDisplay = dept.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ').replace(/\s*[\/\-–—]\s*/g, ' / ')
    sections.push(`## ${deptDisplay}`)
    sections.push('')
    sections.push('| Name | Role | Department |')
    sections.push('|------|------|------------|')
    for (const p of people) {
      sections.push(`| ${p.name} | ${p.role} | ${deptDisplay} |`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

export async function POST(req: NextRequest) {
  let file: File | null = null
  try {
    const formData = await req.formData()
    file = formData.get('file') as File | null
  } catch (err) {
    return NextResponse.json({ error: `Failed to parse upload: ${String(err)}` }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file field in form data' }, { status: 422 })
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json({ error: 'Only PDF files are supported by this endpoint' }, { status: 422 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer as unknown as ArrayBuffer })
    const result = await parser.getText()
    const rawText = result.text

    const lowerName = file.name.toLowerCase()
    const isRoutingDoc =
      /master|van|routing|city|schedule|advance/.test(lowerName) ||
      /CITY\s+\d+\s+[—\-–]/.test(rawText)

    const isContactsDoc =
      /contact|team|crew|personnel|roster/.test(lowerName) ||
      /Name:\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(rawText)

    let markdown = ''

    if (isRoutingDoc) {
      markdown += extractRoutingMarkdown(rawText)
    }

    if (isContactsDoc) {
      const contacts = extractContactsMarkdown(rawText)
      if (contacts) {
        if (markdown) markdown += '\n\n'
        markdown += contacts
      }
    }

    if (!markdown) {
      markdown = rawText
    }

    console.log('[extract-pdf] success', {
      fileName: file.name,
      sizeBytes: buffer.length,
      outputChars: markdown.length,
      isRoutingDoc,
      isContactsDoc,
    })

    return NextResponse.json({
      ok: true,
      text: markdown,
      chars: markdown.length,
      fileName: file.name,
    })
  } catch (err) {
    console.error('[extract-pdf] extraction failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
