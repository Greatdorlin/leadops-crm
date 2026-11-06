import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncMailbox, flushQueuedMessages } from "@/lib/inbox/mailbox";
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const expected = process.env.CRM_INBOX_SYNC_SECRET;
  const value =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (
    !expected ||
    expected.length < 32 ||
    Buffer.byteLength(value) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  )
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    await flushQueuedMessages();
    return NextResponse.json(await syncMailbox(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Email sync is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
