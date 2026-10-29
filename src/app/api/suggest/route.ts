import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/data/catalog";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json([]);
  try {
    return NextResponse.json(await suggest(q));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
