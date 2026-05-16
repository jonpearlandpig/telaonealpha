import { Client } from "@notionhq/client"
import { NextResponse } from "next/server"

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
    })

    const formatted = response.results.map((page: any) => ({
      id: page.id,

      title:
        page.properties?.Name?.title?.[0]?.plain_text ||
        "Untitled",

      status:
        page.properties?.Status?.select?.name || null,

      priority:
        page.properties?.Priority?.select?.name || null,

      summary:
        page.properties?.Summary?.rich_text?.[0]?.plain_text || "",

      owner:
        page.properties?.Owner?.rich_text?.[0]?.plain_text || "",

      updated:
        page.last_edited_time,
    }))

    return NextResponse.json({
      success: true,
      count: formatted.length,
      results: formatted,
    })

  } catch (error) {
    console.error("NOTION ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}
