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

CURRENT OPERATIONAL CONTEXT:
{WIKI_CONTEXT}
`

export const HHO_LIST = [
  { id: 1, name: 'Tim Womble',      version: 'v2.1', status: 'active',   notionId: '' },
  { id: 2, name: 'Juan Otero',      version: 'v1.4', status: 'active',   notionId: '' },
  { id: 3, name: 'John Bowers',     version: 'v1.2', status: 'warm',     notionId: '' },
  { id: 4, name: 'Michael Torres',  version: 'v1.0', status: 'pending',  notionId: '' },
  { id: 5, name: 'David Kim',       version: 'v1.1', status: 'pending',  notionId: '' },
  { id: 6, name: 'Robert Chen',     version: 'v2.0', status: 'warm',     notionId: '' },
  { id: 7, name: 'James Wilson',    version: 'v1.3', status: 'pending',  notionId: '' },
  { id: 8, name: 'Carlos Mendez',   version: 'v1.0', status: 'pending',  notionId: '' },
  { id: 9, name: 'William Park',    version: 'v1.5', status: 'active',   notionId: '' },
  { id: 10, name: 'Thomas Lee',     version: 'v1.2', status: 'pending',  notionId: '' },
  { id: 11, name: 'Richard Adams',  version: 'v1.0', status: 'warm',     notionId: '' },
  { id: 12, name: 'Joseph Martin',  version: 'v1.1', status: 'pending',  notionId: '' },
]
