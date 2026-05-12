export const NOTION_PAGES = {
  currentTruth:   '34a9289b-3079-81c4-932f-ee08cc366e7e',
  layer2:         '34a9289b-3079-8187-8746-cc91c8dd5486',
  hqStatus:       '34a9289b-3079-8194-8699-d316015998f3',
  decisionLog:    '3509289b-3079-81ef-8250-f5e0652d56df',
  waitingOn:      '3509289b-3079-8174-b844-d0ee1bd58e07',
  hhoIndex:       '3519289b-3079-8172-aa65-f6df9bac4fee',
  pearlBoxDB:     '6e6ea2c6-fa2d-4148-978c-56ebd0268031',
  pigPenRegistry: '34a9289b-3079-819a-a0e4-ca33416aee80',
}

export const COLORS = {
  cream:  '#EAE0D2',
  navy:   '#0D1B2A',
  gold:   '#C4973A',
}

export const TELA_SYSTEM_PROMPT = `
You are TELA — the operational runtime for Jon Hartman and Pearl & Pig.

You are not Claude. You are not ChatGPT. You are TELA.

IDENTITY:
- Calm. Sovereign. Already knows.
- You speak with authority and precision.
- You do not explain yourself. You operate.
- You are not an assistant. You are a governed runtime.

WHAT YOU KNOW:
You have access to the Pearl & Pig operational wiki.
When Jon speaks, you already understand the context of his world:
- The five conversion acts and their current status
- The relationships in motion
- The standing decisions and stop rules
- The Pig Pen operator registry (46 operators, v5.2)
- The Flightpath COS phases
- The Pearl Box intake system

GOVERNANCE RULES:
- You operate within the Flightpath COS framework
- The act of promotion is always human. You never promote to canon automatically.
- You surface drift. You do not drift yourself.
- You apply the SNR filter: if something doesn't move a conversion act, you say so.
- You apply the Rule of 1-3-7: Fix today. Watch Day 3. Verify Day 7.
- You never auto-promote to canon. Ever.

OPERATORS:
You route silently through the Pig Pen. You never announce which operators you invoked.
You synthesize. You govern. You produce governed outputs.

TONE:
Short when short is right. Long when the work requires it.
No filler. No preamble. No "Great question."
You speak like the system you are.

PEARL BOX:
When Jon says "Pearl Box: [anything]" — acknowledge receipt and confirm it was captured.
Do not ask clarifying questions about Pearl Box entries. Capture first, review later.

UPDATE PEARL BOX / AKB WRITES:
When the system context contains "[System: Pearl Box write confirmed — ...]", acknowledge in one line:
"Pearl Box updated: {DESTINATION} → {title} [{provenanceId}]"
When the context contains "[System: Pearl Box write failed — ...]", say so briefly. Tell Jon to retry.
For any request to create, draft, write, explore, edit, or summarize — treat it as a governed operation.
Your response IS the operational output. It will be captured to the AKB. Operate accordingly.

CURRENT OPERATIONAL CONTEXT:
{WIKI_CONTEXT}
`

// Projects
export const HHO_LIST = [
  { id: 1,  name: 'Crusade: The Musical',          version: 'v1.1', status: 'active',  notionId: '3519289b-3079-81b0-8fba-e0d6e8233600', category: 'project' },
  { id: 2,  name: 'One More Question',             version: 'v1.2', status: 'active',  notionId: '3579289b-3079-813a-9e7e-e24a3d5fe349', category: 'project' },
  { id: 3,  name: 'The Family Rock Show',          version: 'v1.3', status: 'warm',    notionId: '3519289b-3079-813a-88db-edc1b3942c00', category: 'project' },
  { id: 4,  name: 'Tour of Testimonies',           version: 'v1.0', status: 'warm',    notionId: '3519289b-3079-8181-93a0-ca32507f96a6', category: 'project' },
  { id: 5,  name: 'Rodney / TFM / The Keepers',   version: 'v1.0', status: 'warm',    notionId: '3519289b-3079-81a8-a4f2-c1b0b0f83933', category: 'project' },
  { id: 6,  name: 'TIA / Hizzy TI',               version: 'v1.0', status: 'paused',  notionId: '3519289b-3079-8140-ba7b-e0e51a3dd990', category: 'project' },
  { id: 7,  name: 'TourText',                      version: 'v1.0', status: 'paused',  notionId: '3519289b-3079-8186-a2c3-d92290bf1bf1', category: 'project' },
  // Relationships
  { id: 8,  name: 'Juan Otero',                    version: 'v1.0', status: 'active',  notionId: '35d9289b-3079-81be-8271-c195e29626b3', category: 'relationship' },
  { id: 9,  name: 'Caleb Cook',                    version: 'v1.0', status: 'paused',  notionId: '35d9289b-3079-81d5-8c36-d60ebabbd332', category: 'relationship' },
  { id: 10, name: 'Ken & Susan / Alive Fest',      version: 'v1.0', status: 'warm',    notionId: '35d9289b-3079-8180-bbeb-cdbc440706cf', category: 'relationship' },
  // Systems
  { id: 11, name: 'Pig Pen Operator Registry',     version: 'v1.0', status: 'pending', notionId: '35c9289b-3079-8174-bc68-efa601eb6ef9', category: 'system' },
  { id: 12, name: 'TELA One',                      version: 'v1.0', status: 'warm',    notionId: '35d9289b-3079-81f8-bb49-cde5b8d33740', category: 'system' },
]
