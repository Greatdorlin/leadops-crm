import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageNavigationSettings } from "@/lib/crm/authz";
import {
  getCompanySettings,
  navigationSettingsSchema,
  resolveNavigationConfig,
  updateCompanySettings,
} from "@/lib/crm/workspace-settings";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getCompanySettings();
  return NextResponse.json({ navigation: settings.navigation });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageNavigationSettings({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = navigationSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Navigation settings are invalid." },
      { status: 400 },
    );
  }

  const settings = await updateCompanySettings({
    navigationConfig: resolveNavigationConfig(parsed.data),
  });
  return NextResponse.json({ navigation: settings.navigation });
}
