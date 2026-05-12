import { NextResponse } from 'next/server'
import { routeDestination, deriveTitle, updatePearlBox } from '@/lib/updatePearlBox'

export async function POST(req: Request) {
  try {
    const { content, sourceThread, authority } = await req.json() as {
      content: string
      sourceThread?: string
      authority?: string
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const destination = routeDestination(content)
    const title = deriveTitle(content)

    const result = await updatePearlBox({
      title,
      content: content.trim(),
      destination,
      sourceThread: sourceThread ?? 'Chat',
      authority: authority ?? 'Jon Hartman',
    })

    return NextResponse.json({
      success: true,
      destination: result.destination,
      provenanceId: result.provenanceId,
      title: result.title,
      notionId: result.notionId,
    })
  } catch (err) {
    console.error('update-pearl-box error:', err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
