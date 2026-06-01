import { getClaudeClient } from '@/lib/ai/claude'
import type { VenueContact, VenueEntity, VenuePacketAsset, VenueRestriction } from './types'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/)
    if (match) return Number(match[0])
  }
  return undefined
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function toContacts(value: unknown): VenueContact[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const typed = item as Record<string, unknown>
    const name = typeof typed.name === 'string' ? typed.name.trim() : ''
    const role = typeof typed.role === 'string' ? typed.role.trim() : ''
    if (!name && !role) return []
    return [{
      name,
      role,
      email: typeof typed.email === 'string' ? typed.email.trim() : undefined,
      phone: typeof typed.phone === 'string' ? typed.phone.trim() : undefined,
    }]
  })
}

function toRestrictions(value: unknown): VenueRestriction[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const typed = item as Record<string, unknown>
    const category = typeof typed.category === 'string' ? typed.category.trim() : ''
    const detail = typeof typed.detail === 'string' ? typed.detail.trim() : ''
    if (!category && !detail) return []
    const severity = typed.severity === 'low' || typed.severity === 'medium' || typed.severity === 'high'
      ? typed.severity
      : 'medium'
    return [{ category, detail, severity }]
  })
}

const EXTRACTION_PROMPT = `You normalize venue technical packets for ShowTELA.

Extract venue facts and return ONLY valid JSON with this shape:
{
  "name": "string",
  "confidence": 0.0,
  "profileSummary": "2-3 sentence operational summary",
  "location": "string",
  "capacities": ["string"],
  "stage": { "widthFt": 0, "depthFt": 0, "heightFt": 0, "trimFt": 0 },
  "rigging": { "pointsCount": 0, "maxPointLoadLbs": 0, "notes": ["string"] },
  "power": { "services": ["string"], "shorePowerAvailable": true, "notes": ["string"] },
  "loading": { "dockCount": 0, "driveInAccess": true, "truckAccessNotes": ["string"] },
  "audio": { "available": ["string"], "missing": ["string"], "notes": ["string"] },
  "lighting": { "available": ["string"], "missing": ["string"], "notes": ["string"] },
  "video": { "available": ["string"], "missing": ["string"], "notes": ["string"] },
  "communications": { "available": ["string"], "missing": ["string"], "notes": ["string"] },
  "hospitality": { "available": ["string"], "missing": ["string"], "notes": ["string"] },
  "restrictions": [{ "category": "string", "detail": "string", "severity": "low|medium|high" }],
  "contacts": [{ "name": "string", "role": "string", "email": "string", "phone": "string" }],
  "rawFacts": ["string"]
}

Rules:
- Use only facts supported by the packet.
- If a field is unknown, return an empty array or omit scalar values.
- Keep statements operational and concise.
- Do not invent capacities, dimensions, contacts, or equipment.`

async function extractWithAnthropicFromText(text: string) {
  const client = getClaudeClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1600,
    system: EXTRACTION_PROMPT,
    messages: [{
      role: 'user',
      content: `Normalize this venue technical packet text.\n\n${text.slice(0, 18000)}`,
    }],
  })

  return response.content
    .flatMap((block) => block.type === 'text' ? [block.text] : [])
    .join('')
    .replace(/```json|```/g, '')
    .trim()
}

async function extractWithAnthropicFromPdf(fileName: string, base64Data: string) {
  const client = getClaudeClient()
  const response = await client.beta.messages.create({
    model: 'claude-sonnet-4-20250514',
    betas: ['pdfs-2024-09-25'],
    max_tokens: 1800,
    system: EXTRACTION_PROMPT,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          title: fileName,
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: 'Normalize this venue technical packet into the requested JSON schema.',
        },
      ],
    }],
  })

  return response.content
    .flatMap((block) => block.type === 'text' ? [block.text] : [])
    .join('')
    .replace(/```json|```/g, '')
    .trim()
}

function fallbackVenueFromText(input: {
  workspaceId: string
  fileName: string
  artifactId: string
  packetText: string
  createdAt: string
}): VenueEntity {
  const lines = input.packetText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const name = lines[0]?.replace(/^#\s*/, '') || input.fileName.replace(/\.[^.]+$/, '')
  const lower = input.packetText.toLowerCase()
  const summary = lines.slice(0, 3).join(' ').slice(0, 360) || 'Venue packet uploaded. Structured extraction needs review.'

  return {
    id: `venue:${slugify(name)}`,
    workspaceId: input.workspaceId,
    name,
    packetFileName: input.fileName,
    sourceArtifactId: input.artifactId,
    packetText: input.packetText,
    confidence: 0.35,
    profileSummary: summary,
    location: undefined,
    capacities: [],
    stage: {
      widthFt: toNumber(lower.match(/stage width[^0-9]*(\d+)/i)?.[1]),
      depthFt: toNumber(lower.match(/stage depth[^0-9]*(\d+)/i)?.[1]),
      heightFt: toNumber(lower.match(/ceiling|trim[^0-9]*(\d+)/i)?.[1]),
      trimFt: toNumber(lower.match(/trim[^0-9]*(\d+)/i)?.[1]),
    },
    rigging: { notes: [], pointsCount: undefined, maxPointLoadLbs: undefined },
    power: { services: [], notes: [] },
    loading: { truckAccessNotes: [] },
    audio: { available: [], missing: [], notes: [] },
    lighting: { available: [], missing: [], notes: [] },
    video: { available: [], missing: [], notes: [] },
    communications: { available: [], missing: [], notes: [] },
    hospitality: { available: [], missing: [], notes: [] },
    restrictions: [],
    contacts: [],
    rawFacts: lines.slice(0, 20),
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  }
}

function normalizeVenueEntity(input: {
  workspaceId: string
  fileName: string
  artifactId: string
  packetText: string
  parsed: Record<string, unknown>
  createdAt: string
}): VenueEntity {
  const name = typeof input.parsed.name === 'string' && input.parsed.name.trim()
    ? input.parsed.name.trim()
    : input.fileName.replace(/\.[^.]+$/, '')

  const stage = (input.parsed.stage ?? {}) as Record<string, unknown>
  const rigging = (input.parsed.rigging ?? {}) as Record<string, unknown>
  const power = (input.parsed.power ?? {}) as Record<string, unknown>
  const loading = (input.parsed.loading ?? {}) as Record<string, unknown>

  const bucket = (value: unknown) => {
    const typed = (value ?? {}) as Record<string, unknown>
    return {
      available: toStringArray(typed.available),
      missing: toStringArray(typed.missing),
      notes: toStringArray(typed.notes),
    }
  }

  return {
    id: `venue:${slugify(name)}`,
    workspaceId: input.workspaceId,
    name,
    packetFileName: input.fileName,
    sourceArtifactId: input.artifactId,
    packetText: input.packetText,
    confidence: typeof input.parsed.confidence === 'number' ? input.parsed.confidence : 0.7,
    profileSummary: typeof input.parsed.profileSummary === 'string'
      ? input.parsed.profileSummary.trim()
      : 'Venue packet normalized into the operational schema.',
    location: typeof input.parsed.location === 'string' ? input.parsed.location.trim() : undefined,
    capacities: toStringArray(input.parsed.capacities),
    stage: {
      widthFt: toNumber(stage.widthFt),
      depthFt: toNumber(stage.depthFt),
      heightFt: toNumber(stage.heightFt),
      trimFt: toNumber(stage.trimFt),
    },
    rigging: {
      pointsCount: toNumber(rigging.pointsCount),
      maxPointLoadLbs: toNumber(rigging.maxPointLoadLbs),
      notes: toStringArray(rigging.notes),
    },
    power: {
      services: toStringArray(power.services),
      shorePowerAvailable: typeof power.shorePowerAvailable === 'boolean' ? power.shorePowerAvailable : undefined,
      notes: toStringArray(power.notes),
    },
    loading: {
      dockCount: toNumber(loading.dockCount),
      driveInAccess: typeof loading.driveInAccess === 'boolean' ? loading.driveInAccess : undefined,
      truckAccessNotes: toStringArray(loading.truckAccessNotes),
    },
    audio: bucket(input.parsed.audio),
    lighting: bucket(input.parsed.lighting),
    video: bucket(input.parsed.video),
    communications: bucket(input.parsed.communications),
    hospitality: bucket(input.parsed.hospitality),
    restrictions: toRestrictions(input.parsed.restrictions),
    contacts: toContacts(input.parsed.contacts),
    rawFacts: toStringArray(input.parsed.rawFacts),
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  }
}

export async function extractVenueEntity(input: {
  workspaceId: string
  fileName: string
  artifactId: string
  packetText?: string
  pdfBase64?: string
  createdAt?: string
}): Promise<VenueEntity> {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const packetText = input.packetText?.trim() ?? ''

  try {
    let raw = ''

    if (input.pdfBase64 && process.env.ANTHROPIC_API_KEY) {
      raw = await extractWithAnthropicFromPdf(input.fileName, input.pdfBase64)
    } else if (packetText && process.env.ANTHROPIC_API_KEY) {
      raw = await extractWithAnthropicFromText(packetText)
    }

    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return normalizeVenueEntity({
        workspaceId: input.workspaceId,
        fileName: input.fileName,
        artifactId: input.artifactId,
        packetText,
        parsed,
        createdAt,
      })
    }
  } catch (error) {
    console.error('[venue-intelligence] venue extraction failed:', error)
  }

  return fallbackVenueFromText({
    workspaceId: input.workspaceId,
    fileName: input.fileName,
    artifactId: input.artifactId,
    packetText,
    createdAt,
  })
}

export function combineVenuePacketAssets(assets: VenuePacketAsset[]) {
  return assets
    .map((asset) => `# ${asset.name}\n${asset.text || `[${asset.mimeType} uploaded]`}`.trim())
    .filter(Boolean)
    .join('\n\n---\n\n')
}
