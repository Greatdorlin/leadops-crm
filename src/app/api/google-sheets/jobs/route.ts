import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const jobs = await leadStore.listSyncJobs({
    provider: "google_sheets",
    limit: 20,
  });

  return NextResponse.json({ jobs });
}
