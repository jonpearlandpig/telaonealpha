/**
 * POST /api/seed-anchor-directory
 *
 * One-shot ingestion route for crew anchor directory documents.
 * Parses the markdown table rows as individual evidence chunks,
 * persists each as a durable artifact in the showtela workspace,
 * so answerRoleFromEvidenceChunks can find exact role→name mappings.
 *
 * Usage: POST with { content: "<markdown string>", sourceFile: "<title>" }
 * Or call with no body to seed the canonical Positive Rocks directory.
 */

import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/api-auth'
import {
  createEvidenceChunksFromText,
  evidenceChunkToArtifact,
} from '@/lib/showtela/evidenceAuthority'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

// The canonical directory — embedded so it can be seeded without an upload
const CANONICAL_DIRECTORY = `# THE POSITIVE ROCKS
# SPRING 2027 ARENA TOUR
# TOUR TEAM CREW ANCHOR DIRECTORY

# EXECUTIVE & TOUR LEADERSHIP

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Executive Producer | Jon Hartman | jonhartman@pigpenpositiverocks.com | (615) 555-0101 | Final creative + operational authority |
| Business Director | Trey Mills | treymills@pigpenpositiverocks.com | (615) 555-0102 | Partnerships + monetization |
| Operational Architect | Marty Hillsdale | martyhillsdale@pigpenpositiverocks.com | (615) 555-0103 | Workflow systems |
| Tour Director | Kay Jing | kayjing@pigpenpositiverocks.com | (615) 555-0104 | Tour execution lead |
| Tour Coordinator | Sam Rivers | samrivers@pigpenpositiverocks.com | (615) 555-0105 | Daily ops + scheduling |
| Production Coordinator | Maya Chen | mayachen@pigpenpositiverocks.com | (615) 555-0106 | Venue onboarding |
| Tour Counsel | Carmen Wade | carmenwade@pigpenpositiverocks.com | (615) 555-0107 | Contracts + compliance |
| Risk Oversight | Levi Foster | levifoster@pigpenpositiverocks.com | (615) 555-0108 | Risk analysis |

# CREATIVE DIRECTION

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Creative Director | Naomi Top | naomitop@pigpenpositiverocks.com | (615) 555-0201 | Narrative + visuals |
| Scenic Design | Rolondo Harrison | roloharrison@pigpenpositiverocks.com | (615) 555-0202 | Scenic systems |
| Movement Director | Mo Landing | molanding@pigpenpositiverocks.com | (615) 555-0203 | Choreography |
| Costume Director | Dia Garcia | diagarcia@pigpenpositiverocks.com | (615) 555-0204 | Wardrobe continuity |
| Senior Illustrator | Vienna Cray | viennacray@pigpenpositiverocks.com | (615) 555-0205 | Symbol systems |
| Concept Artist | Ellie Summers | elliesummers@pigpenpositiverocks.com | (615) 555-0206 | Visual iteration |

# MUSIC & PERFORMANCE

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Music Director | Turner Smith | turnersmith@pigpenpositiverocks.com | (615) 555-0301 | Musical identity |
| Band Leader | Caleb Rhodes | calebrhodes@pigpenpositiverocks.com | (615) 555-0302 | Live band coordination |
| Playback Director | Otto Matic | ottomatic@pigpenpositiverocks.com | (615) 555-0303 | Tracks + playback |
| Vocal Director | Sarah Vale | sarahvale@pigpenpositiverocks.com | (615) 555-0304 | Vocal rehearsals |
| Rehearsal Pianist | Ethan Cole | ethancole@pigpenpositiverocks.com | (615) 555-0305 | Rehearsal support |
| Drum Tech | Cruz Hartman | cruzhartman@pigpenpositiverocks.com | (615) 555-0306 | Drum systems |

# STAGE MANAGEMENT

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Stage Manager | Sam Rivers | samrivers@pigpenpositiverocks.com | (615) 555-0401 | Deck execution |
| Assistant Stage Manager | Maya Chen | mayachen@pigpenpositiverocks.com | (615) 555-0402 | Talent movement |
| Deck Chief | Tyler Tiempo | tylertiempo@pigpenpositiverocks.com | (615) 555-0403 | Stage resets |
| Cue Caller | Naomi Top | naomitop@pigpenpositiverocks.com | (615) 555-0404 | Show pacing |
| Stage PA | Eli Stone | elistone@pigpenpositiverocks.com | (615) 555-0405 | Quick-turn support |

# AUDIO DEPARTMENT

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| FOH Engineer | Fory Cornier | forycornier@pigpenpositiverocks.com | (615) 555-0501 | Arena mix |
| Monitor Engineer | Tyler Tiempo | tylertiempo@pigpenpositiverocks.com | (615) 555-0502 | Monitor systems |
| RF Coordinator | Marcus Stone | marcusstone@pigpenpositiverocks.com | (615) 555-0503 | Wireless management |
| Playback Tech | Otto Matic | ottomatic@pigpenpositiverocks.com | (615) 555-0504 | Playback redundancy |
| Audio Systems Tech | Liam Brooks | liambrooks@pigpenpositiverocks.com | (615) 555-0505 | PA deployment |
| Patch Tech | Sarah Wynn | sarahwynn@pigpenpositiverocks.com | (615) 555-0506 | Signal flow |

# LIGHTING DEPARTMENT

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Lighting Director | Fred Mann | fredmann@pigpenpositiverocks.com | (615) 555-0601 | Lighting arc |
| Lighting Programmer | Harper Lane | harperlane@pigpenpositiverocks.com | (615) 555-0602 | Cue programming |
| Follow Spot Lead | Emma Frost | emmafrost@pigpenpositiverocks.com | (615) 555-0603 | Spot operations |
| Dimmer Tech | Carter Hale | carterhale@pigpenpositiverocks.com | (615) 555-0604 | Electrical systems |
| Lighting Crew Chief | Blake Tanner | blaketanner@pigpenpositiverocks.com | (615) 555-0605 | Rig deployment |

# VIDEO / LED / PROJECTION

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Video Director | Naomi Top | naomitop@pigpenpositiverocks.com | (615) 555-0701 | IMAG + projection |
| LED Systems Lead | Miles Okada | milesokada@pigpenpositiverocks.com | (615) 555-0702 | LED runtime |
| Camera Director | Eli Tran | elitran@pigpenpositiverocks.com | (615) 555-0703 | Live capture |
| Projection Mapping | Vienna Cray | viennacray@pigpenpositiverocks.com | (615) 555-0704 | Visual overlays |
| Playback Graphics | Ellie Summers | elliesummers@pigpenpositiverocks.com | (615) 555-0705 | Motion assets |

# SHOWTELA OPERATIONS

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Runtime Lead | Miles Okada | milesokada@pigpenpositiverocks.com | (615) 555-0801 | Runtime integrity |
| Continuity Manager | Sam Rivers | samrivers@pigpenpositiverocks.com | (615) 555-0802 | Operational memory |
| Dispatch Lead | Kay Jing | kayjing@pigpenpositiverocks.com | (615) 555-0803 | Routing + alerts |
| Voice Runtime Ops | Marcus Stone | marcusstone@pigpenpositiverocks.com | (615) 555-0804 | TELA Talk |
| Automation Runtime | Otto Matic | ottomatic@pigpenpositiverocks.com | (615) 555-0805 | Auto-generation |
| Data & Analytics | Eli Tran | elitran@pigpenpositiverocks.com | (615) 555-0806 | Metrics + reporting |

# TOURING OPERATIONS

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Transportation Captain | Tyler Tiempo | tylertiempo@pigpenpositiverocks.com | (615) 555-0901 | Fleet movement |
| Bus Coordinator | Liam Brooks | liambrooks@pigpenpositiverocks.com | (615) 555-0902 | Bus schedules |
| Hotel Coordinator | Maya Chen | mayachen@pigpenpositiverocks.com | (615) 555-0903 | Hospitality routing |
| Credential Manager | Carmen Wade | carmenwade@pigpenpositiverocks.com | (615) 555-0904 | Access control |
| Backstage Logistics | Sam Rivers | samrivers@pigpenpositiverocks.com | (615) 555-0905 | Compound movement |
| Dock Lead | Blake Tanner | blaketanner@pigpenpositiverocks.com | (615) 555-0906 | Load-in/load-out |

# GUEST EXPERIENCE

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Guest Experience Director | Leah Monroe | leahmonroe@pigpenpositiverocks.com | (615) 555-1001 | Audience journey |
| VIP Director | Harper Lane | harperlane@pigpenpositiverocks.com | (615) 555-1002 | VIP activations |
| Merchandise Director | Sofia Reyes | sofiareyes@pigpenpositiverocks.com | (615) 555-1003 | Merch operations |
| Volunteer Coordinator | Maya Chen | mayachen@pigpenpositiverocks.com | (615) 555-1004 | Volunteer onboarding |
| Wayfinding Lead | Ellie Summers | elliesummers@pigpenpositiverocks.com | (615) 555-1005 | Signage systems |
| Parent Hospitality | Leah Monroe | leahmonroe@pigpenpositiverocks.com | (615) 555-1006 | Family hospitality |

# MARKETING & CONTENT

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Social Director | Jack Jones | jackjones@pigpenpositiverocks.com | (615) 555-1101 | Social publishing |
| Marketing Director | Harper Lane | harperlane@pigpenpositiverocks.com | (615) 555-1102 | Campaign execution |
| Partnerships Director | Sofia Reyes | sofiareyes@pigpenpositiverocks.com | (615) 555-1103 | Sponsorships |
| Sponsor Relations | Grant Fields | grantfields@pigpenpositiverocks.com | (615) 555-1104 | Brand activation |
| Tour Photographer | Eli Tran | elitran@pigpenpositiverocks.com | (615) 555-1105 | Tour capture |
| Vertical Content Team | Jack Jones | jackjones@pigpenpositiverocks.com | (615) 555-1106 | Reels + TikTok |

# SECURITY & SAFETY

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Head of Security | Marcus Stone | marcusstone@pigpenpositiverocks.com | (615) 555-1201 | Security coordination |
| Touring Medic | Rachel Kim | rachelkim@pigpenpositiverocks.com | (615) 555-1202 | Crew care |
| Child Safety Lead | Leah Monroe | leahmonroe@pigpenpositiverocks.com | (615) 555-1203 | Family-safe operations |
| Emergency Coordinator | Kay Jing | kayjing@pigpenpositiverocks.com | (615) 555-1204 | Escalation management |
| Risk Review | Levi Foster | levifoster@pigpenpositiverocks.com | (615) 555-1205 | Threat assessment |

# BACKLINE & TECH

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Guitar Tech | Caleb Rhodes | calebrhodes@pigpenpositiverocks.com | (615) 555-1301 | Guitar systems |
| Drum Tech | Cruz Hartman | cruzhartman@pigpenpositiverocks.com | (615) 555-1302 | Drum maintenance |
| Keys Tech | Ethan Cole | ethancole@pigpenpositiverocks.com | (615) 555-1303 | Playback rigs |
| RF Tech | Marcus Stone | marcusstone@pigpenpositiverocks.com | (615) 555-1304 | RF systems |
| IT / Networking | Miles Okada | milesokada@pigpenpositiverocks.com | (615) 555-1305 | Connectivity |`

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Auth: valid session OR seed secret key (for one-time URL triggering)
  const url = new URL(req.url)
  const secretKey = url.searchParams.get('key')
  if (secretKey !== 'tela-seed-2026') {
    const auth = await requireApiSession(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let content = CANONICAL_DIRECTORY
  let sourceFile = 'positive_rocks_tour_team_crew_anchor_directory_v1'

  // Allow override via request body
  try {
    const body = await req.json() as { content?: string; sourceFile?: string }
    if (body.content) content = body.content
    if (body.sourceFile) sourceFile = body.sourceFile
  } catch {
    // No body — use canonical
  }

  const now = new Date().toISOString()

  // Parse into row-level evidence chunks
  const chunks = createEvidenceChunksFromText({ sourceFile, extractedText: content })

  // Convert to artifact records
  const artifacts = chunks.map((chunk) => evidenceChunkToArtifact(chunk, now))

  // Persist to durable memory
  await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, {
    artifacts,
    entities: [],
    snapshots: [],
  })

  return NextResponse.json({
    ok: true,
    sourceFile,
    chunksIndexed: chunks.length,
    artifactsSeeded: artifacts.length,
    sampleChunks: chunks.slice(0, 3).map((c) => ({
      id: c.id,
      section: c.sourceSection,
      text: c.extractedText.slice(0, 120),
    })),
  })
}
