import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  return NextResponse.json(
    { error: "Email sync has been retired. Inbox is for team messaging." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
