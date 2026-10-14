import { NextRequest, NextResponse } from "next/server";
import { searchPhoton } from "@/lib/destinations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 6;
  const lang = searchParams.get("lang") || "en";

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const outcome = await searchPhoton(q, { limit, lang });
    return NextResponse.json(outcome, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        results: [],
        error: `Proxy search failed: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
