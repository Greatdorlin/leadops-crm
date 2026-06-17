import { NextResponse } from "next/server";
import { analyticsSchema } from "@/lib/pathway-engine/schemas";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyticsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
    }

    const record = await leadStore.trackByReportToken(parsed.data.token, parsed.data.event);

    if (!record) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to track event." }, { status: 500 });
  }
}
