import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 10,
    });

    return NextResponse.json({
      status: "ok",
      results: response.results,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json({
      status: "error",
      message: error.message,
    });
  }
}
