import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageDashboardSettings } from "@/lib/crm/authz";
import {
  dashboardCustomizationSchema,
  resolveDashboardConfig,
} from "@/lib/crm/workspace-settings";
import {
  getCompanySettings,
  updateCompanySettings,
} from "@/lib/crm/workspace-settings-server";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getCompanySettings();
  return NextResponse.json({ dashboard: settings.dashboard });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageDashboardSettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = dashboardCustomizationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dashboard settings are invalid." },
      { status: 400 },
    );
  }

  const settings = await updateCompanySettings({
    dashboardConfig: resolveDashboardConfig(parsed.data),
  });
  return NextResponse.json({ dashboard: settings.dashboard });
}
