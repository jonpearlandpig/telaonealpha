import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

type RichTextItem = { plain_text?: string };
type SelectItem = { name?: string };
type PropertyShape = {
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  select?: SelectItem | null;
};
type NotionPageLike = {
  id: string;
  last_edited_time: string;
  properties?: Record<string, PropertyShape>;
};

type NotionDatabaseQueryClient = {
  databases: {
    query: (args: { database_id: string }) => Promise<{ results: unknown[] }>;
  };
};

export async function GET() {
  try {
    const client = notion as unknown as NotionDatabaseQueryClient;
    const response = await client.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
    });

    const formatted = response.results.map((page) => {
      const p = page as NotionPageLike;

      return {
        id: p.id,
        title: p.properties?.Name?.title?.[0]?.plain_text || "Untitled",
        status: p.properties?.Status?.select?.name || null,
        priority: p.properties?.Priority?.select?.name || null,
        summary: p.properties?.Summary?.rich_text?.[0]?.plain_text || "",
        owner: p.properties?.Owner?.rich_text?.[0]?.plain_text || "",
        updated: p.last_edited_time,
      };
    });

    return NextResponse.json({ success: true, count: formatted.length, results: formatted });
  } catch (error) {
    console.error("NOTION ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
