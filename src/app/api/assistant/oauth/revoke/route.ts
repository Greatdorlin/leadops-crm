import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { assistantTokens } from "@/lib/db/schema";
import { AssistantError, hashSecret } from "@/lib/assistant/contracts";
import { authenticateClient } from "@/lib/assistant/oauth";
import { oauthParameters } from "@/lib/assistant/oauth-http";
export async function POST(request: Request) {
  try {
    const { params, method } = await oauthParameters(request);
    const client = await authenticateClient(params, method);
    const db = getDb();
    const [token] = await db
      .select()
      .from(assistantTokens)
      .where(
        and(
          eq(assistantTokens.clientId, client.id),
          or(
            eq(
              assistantTokens.accessHash,
              hashSecret(params.get("token") ?? ""),
            ),
            eq(
              assistantTokens.refreshHash,
              hashSecret(params.get("token") ?? ""),
            ),
          ),
        ),
      );
    if (token)
      await db
        .update(assistantTokens)
        .set({ revokedAt: new Date() })
        .where(eq(assistantTokens.familyId, token.familyId));
    return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_client" },
      {
        status: e instanceof AssistantError ? e.status : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
