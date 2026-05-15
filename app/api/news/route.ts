import { NextResponse } from "next/server";
import { fetchFifaNews } from "@/lib/news";

export async function GET() {
  try {
    const items = await fetchFifaNews();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "News fetch failed"
      },
      { status: 502 }
    );
  }
}
