import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    source: "ShowTELA",
    feed: [
      {
        id: 1,
        title: "ShowTELA Runtime Active",
      },
    ],
  });
}
