import { NextResponse } from "next/server";
import { body, failure } from "@/lib/assistant/http";
import { registerClient } from "@/lib/assistant/oauth";
export async function POST(request: Request) {
  try {
    return NextResponse.json(
      await registerClient(
        await body(request),
        request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      ),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
