import { NextResponse } from 'next/server'
import { answerRoleFromEvidenceArtifacts } from '@/lib/showtela/evidenceAuthority'
import { loadDurableContinuity } from '@/lib/runtime/durableMemory'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')?.trim()

  if (!role) {
    return NextResponse.json({ error: 'role is required' }, { status: 422 })
  }

  const durable = await loadDurableContinuity(SHOWTELA_WORKSPACE_ID)
  const answer = answerRoleFromEvidenceArtifacts(durable.artifacts, role)

  if (!answer) {
    return NextResponse.json({
      confidence: 'NOT_FOUND',
      answer: 'Not found in current ShowTELA sources.',
    })
  }

  return NextResponse.json({
    confidence: 'VERIFIED',
    answer: answer.answer,
    sourceFile: answer.sourceFile,
    sourceSection: answer.sourceSection,
    matchingText: answer.matchingText,
    evidenceChunkId: answer.evidenceChunkId,
  })
}
