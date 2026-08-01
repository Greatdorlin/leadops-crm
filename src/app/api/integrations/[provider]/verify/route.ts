import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import {
  isVerifiableIntegrationProvider,
  verifyIntegrationConnection,
} from "@/lib/integrations/connection-verification";

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
    const result = await verifyIntegrationConnection(provider);
    return NextResponse.json(result, {
      status: result.configured ? 200 : 400,
    });
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
