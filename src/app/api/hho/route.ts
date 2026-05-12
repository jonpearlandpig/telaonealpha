import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get('pageId')

  if (!pageId) {
    return NextResponse.json({ error: 'pageId required' }, { status: 400 })
  }

  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    })

    const lines: string[] = []

    for (const block of response.results) {
      const b = block as Record<string, unknown>
      const type = b.type as string

      if (type === 'table_row') {
        const row = b.table_row as { cells: Array<Array<{ plain_text: string }>> }
        const cells = row.cells.map((c) => c.map((t) => t.plain_text).join('')).join(' | ')
        if (cells.trim()) lines.push(cells)
        continue
      }

      const rtBlock = b[type] as { rich_text?: Array<{ plain_text: string }> } | undefined
      if (rtBlock?.rich_text) {
        const text = rtBlock.rich_text.map((t) => t.plain_text).join('')
        if (text.trim()) lines.push(text)
      }
    }

    return NextResponse.json({ text: lines.join('\n') })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
