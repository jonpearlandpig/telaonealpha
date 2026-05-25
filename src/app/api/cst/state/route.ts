import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('operational_states')
      .select('*')
      .eq('workspace_id', 'pearlandpig')
      .eq('show_id', 'crusade')
      .eq('is_active', true)
      .order('state_entered_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    return NextResponse.json({
      states: rows,
      critical: rows.filter((s: { severity: string }) => s.severity === 'critical').length,
      high: rows.filter((s: { severity: string }) => s.severity === 'high').length,
      evaluatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
