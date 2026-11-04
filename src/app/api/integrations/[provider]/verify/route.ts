import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leadSourcePayloads } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import {
  isVerifiableIntegrationProvider,
  verifyIntegrationConnection,
} from "@/lib/integrations/connection-verification";

const webhookSources = {
  facebook: "facebook_lead_ads",
  google_ads: "google_ads",
  linkedin: "linkedin_lead_gen_forms",
  tiktok: "tiktok_lead_ads",
} as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { provider } = await params;
  if (!isVerifiableIntegrationProvider(provider)) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 404 });
  }

  try {
    const source = provider === "google_sheets" ? null : webhookSources[provider];
    const [result, delivery] = await Promise.all([
      verifyIntegrationConnection(provider),
      source
        ? Promise.resolve().then(() => getDb().query.leadSourcePayloads.findFirst({
            columns: { processedAt: true },
            where: and(eq(leadSourcePayloads.source, source), eq(leadSourcePayloads.processingStatus, "processed")),
            orderBy: [desc(leadSourcePayloads.createdAt)],
          })).catch(() => null)
        : null,
    ]);
    return NextResponse.json(
      { ...result, lastProcessedDeliveryAt: delivery?.processedAt?.toISOString() ?? null },
      { status: result.configured ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      {
        configured: true,
        verified: false,
        error: "The provider could not be reached. No credentials were changed.",
      },
      { status: 502 },
    );
  }
}
