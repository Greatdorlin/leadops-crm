import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";

export async function POST() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageIntegrationsAccess(context.accessLevel, context.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "Sender sync is temporarily unavailable while Leads Desk completes the normalized outbound sync runtime.",
    },
    { status: 410 },
  );
}
