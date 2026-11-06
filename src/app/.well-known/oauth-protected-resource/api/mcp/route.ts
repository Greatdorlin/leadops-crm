export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { origin } from "@/lib/assistant/http";
import { resourceUrl } from "@/lib/assistant/oauth";
export function GET() {
  return NextResponse.json({
    resource: resourceUrl(),
    authorization_servers: [origin()],
    scopes_supported: ["crm:read", "crm:write", "offline_access"],
    bearer_methods_supported: ["header"],
  });
}
