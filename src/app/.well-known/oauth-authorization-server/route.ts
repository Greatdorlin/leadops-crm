export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { origin } from "@/lib/assistant/http";
export function GET() {
  const base = origin();
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/assistant/connect`,
    token_endpoint: `${base}/api/assistant/oauth/token`,
    registration_endpoint: `${base}/api/assistant/oauth/register`,
    revocation_endpoint: `${base}/api/assistant/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["crm:read", "crm:write", "offline_access"],
  });
}
