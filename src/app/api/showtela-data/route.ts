import { NextResponse } from 'next/server'
import { getShowTelaHome } from '@/lib/showtela/hydration'

export async function GET() {
  const data = await getShowTelaHome()
  return NextResponse.json({
    isMockData: data.activeOps[0]?.name === 'Jon',
    activeOps: data.activeOps.map(p => ({ name: p.name, role: p.role })),
    fluencyPartners: data.fluencyPartners.map(p => ({ name: p.name, role: p.role })),
    operations: data.operations.map(o => ({ name: o.title, status: o.status })),
    unresolved: data.unresolved.map(u => ({ title: u.title, severity: u.severity })),
    feed: data.continuityFeed.slice(0, 5).map(e => ({ headline: e.headline, owner: e.owner?.name })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
