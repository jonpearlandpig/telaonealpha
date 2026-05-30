import { NextResponse } from 'next/server'
import { loadDurableContinuity } from '@/lib/runtime/durableMemory'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { detectContaminatedType } from '@/lib/showtela/anchorDirectory'
import { deleteEntityRow, upsertEntityRow } from '@/lib/supabase/queries'

// Dry-run by default. Pass ?apply=true to commit corrections.
//
// Strategy:
//   1. Read all entities from the durable store.
//   2. For each entity typed 'person', run detectContaminatedType().
//   3. If contaminated: compute the corrected ID (newType:slug), delete the old record,
//      insert the corrected record. The old ID is gone; new references will use the correct type.
//   4. Ambiguous names (detected as 'context'/tentative) are NOT touched — they may be real people.

export async function GET(req: Request): Promise<NextResponse> {
  const adminSecret = process.env.ADMIN_MIGRATION_SECRET
  const authHeader = (req as Request & { headers: Headers }).headers.get('authorization')
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const apply = searchParams.get('apply') === 'true'

  const { entities } = await loadDurableContinuity(SHOWTELA_WORKSPACE_ID)

  const contaminated: Array<{
    oldId: string
    name: string
    oldType: string
    newType: string
    trustRank: number
    authoritySource: string
    corrected: boolean
  }> = []

  const clean: string[] = []

  for (const entity of entities) {
    const correction = detectContaminatedType(entity.type, entity.name)
    if (!correction) {
      clean.push(entity.id)
      continue
    }

    const slug = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const newId = `${correction.type}:${slug}`

    contaminated.push({
      oldId: entity.id,
      name: entity.name,
      oldType: entity.type,
      newType: correction.type,
      trustRank: correction.trustRank,
      authoritySource: correction.authoritySource,
      corrected: apply,
    })

    if (apply) {
      const now = new Date().toISOString()
      await upsertEntityRow({
        id: newId,
        workspaceId: SHOWTELA_WORKSPACE_ID,
        name: entity.name,
        type: correction.type,
        continuityCount: entity.continuityCount,
        unresolvedLinks: entity.unresolvedLinks,
        relatedArtifacts: entity.relatedArtifacts,
        relatedThreads: entity.relatedThreads,
        temporalClusters: entity.temporalClusters,
        createdAt: entity.firstSeen,
        updatedAt: now,
        provenance: {
          sourceType: 'migration',
          sourceId: 'migrate-entities-v1',
          truthRank: correction.trustRank,
          authorityLevel: correction.authoritySource,
          lineageRefs: [entity.id],
          createdAt: entity.firstSeen,
          updatedAt: now,
        },
      })
      await deleteEntityRow(entity.id)
    }
  }

  return NextResponse.json({
    mode: apply ? 'applied' : 'dry-run',
    totalEntities: entities.length,
    cleanCount: clean.length,
    contaminatedCount: contaminated.length,
    contaminated,
  })
}
