import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAppearanceSettings } from "@/lib/crm/authz";
import {
  appearanceSettingsSchema,
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
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageAppearanceSettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = appearanceSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Appearance settings are invalid." },
      { status: 400 },
    );
  }

  const settings = await updateCompanySettings(parsed.data);
  return NextResponse.json({ settings });
}
