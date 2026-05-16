import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export async function GET() {
  try {
   const response = await notion.dataSources.query({
      database_id: DATABASE_ID,
      page_size: 10,
    });

    const feed = response.results.map((page: any, index: number) => {
      const props = page.properties || {};

      const title =
        props.Name?.title?.[0]?.plain_text ||
        props.Title?.title?.[0]?.plain_text ||
        `Untitled ${index + 1}`;

      return {
        id: page.id,
        title,
      };
    });

    return NextResponse.json({
      status: "ok",
      source: "Notion",
      feed,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
    });
  }
}
