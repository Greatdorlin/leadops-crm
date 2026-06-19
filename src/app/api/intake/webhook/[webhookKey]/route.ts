import { NextResponse } from "next/server";
import { processWebhookIntake } from "@/lib/crm/intake-runtime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookKey: string }> },
) {
  const { webhookKey } = await params;
  const payload = await request.json().catch(() => null);
  const result = await processWebhookIntake({
    webhookKey,
    payload,
  });

  return NextResponse.json(result.body, { status: result.status });
}
