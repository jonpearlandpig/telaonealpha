import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: "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",
});

const DATABASE_ID = "7d1de18bef324b098fde35d4c481a532";

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
    return NextResponse.json({
      status: "error",
      message: error.message,
    });
  }
}
