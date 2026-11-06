import { NextResponse } from "next/server";
import { exchangeToken } from "@/lib/assistant/oauth";
import { oauthParameters } from "@/lib/assistant/oauth-http";
import { AssistantError } from "@/lib/assistant/contracts";
export async function POST(request: Request) {
  try {
    const { params, method } = await oauthParameters(request);
    return NextResponse.json(await exchangeToken(params, method), {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (e) {
    const clientError =
      e instanceof AssistantError && e.message === "invalid_client";
    return NextResponse.json(
      { error: clientError ? "invalid_client" : "invalid_grant" },
      {
        status: clientError ? 401 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
