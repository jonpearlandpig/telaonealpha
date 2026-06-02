import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/api-auth'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildShowTelaVMFromHydratedState } from '@/lib/showtela/buildViewModel'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

function firstName(value: string) {
  return value.trim().toLowerCase().split(/\s+/)[0] ?? ''
}

function matchesPerson(candidate: string, query: string) {
  const normalizedCandidate = candidate.trim().toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedCandidate || !normalizedQuery) return false
  return normalizedCandidate === normalizedQuery ||
    normalizedCandidate.includes(normalizedQuery) ||
    firstName(normalizedCandidate) === firstName(normalizedQuery)
}

export async function GET(request: Request) {
  const auth = await requireApiSession(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') ?? ''
  const workspaceId = searchParams.get('workspaceId')?.trim() || SHOWTELA_WORKSPACE_ID

  const state = await hydrateRuntime(workspaceId)
  const vm = buildShowTelaVMFromHydratedState(state)
  const person = vm.activeOps.find((item) => matchesPerson(item.name, name))

  if (!person) {
    return NextResponse.json({ unresolved: [], feed: [], notes: 'No runtime entity matched this person.' }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const personFirst = firstName(person.name)
  const unresolved = vm.unresolved
    .filter((item) => item.owner ? matchesPerson(item.owner, person.name) : false)
    .map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      blocking: item.blocking,
      operation: item.operation,
      aging: item.aging,
    }))

  const feed = vm.feed
    .filter((item) => {
      const linked = item.linkedEntities.some((entity) => matchesPerson(entity, person.name))
      return linked || matchesPerson(item.owner, person.name) || item.summary.toLowerCase().includes(personFirst)
    })
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      headline: item.title,
      body: item.summary,
      timestamp: item.timestamp,
    }))

  return NextResponse.json({
    unresolved,
    feed,
    notes: `${person.name}${person.latest ? ` · ${person.latest}` : ''}. Source: ${vm.source ?? 'runtime'}.`,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
