import { NextResponse } from "next/server";
import { processWebhookIntake } from "@/lib/crm/intake-runtime";
import { readBoundedJsonObject } from "@/lib/http/bounded-body";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookKey: string }> },
) {
  const { webhookKey } = await params;
  const body = await readBoundedJsonObject(request);
  if (!body.ok) {
    return NextResponse.json({ success: false, message: body.error }, { status: body.status });
  }
  const result = await processWebhookIntake({
    webhookKey,
    payload: body.value,
  });

  return NextResponse.json(result.body, { status: result.status });
}
