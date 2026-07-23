import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageCurrencySettings } from "@/lib/crm/authz";
import { regionalSettingsSchema } from "@/lib/crm/workspace-settings";
import {
  getCompanySettings,
  updateCompanySettings,
} from "@/lib/crm/workspace-settings-server";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const settings = await getCompanySettings();
  return NextResponse.json({
    settings: {
      country: settings.defaultCountry,
      region: settings.defaultRegion,
      city: settings.defaultCity,
      timeZone: settings.timeZone,
      locale: settings.locale,
    },
  });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageCurrencySettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = regionalSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Regional settings are invalid." },
      { status: 400 },
    );
  }

  const settings = await updateCompanySettings({
    defaultCountry: parsed.data.country,
    defaultRegion: parsed.data.region || null,
    defaultCity: parsed.data.city || null,
    timeZone: parsed.data.timeZone,
    locale: parsed.data.locale,
  });
  await recordWorkspaceAuditEvent({
    eventType: "workspace.regional_settings_updated",
    actorEmail: context.session.user?.email ?? "unknown",
    actorUserId: context.crmUser?.id,
    targetType: "company_settings",
    targetId: settings.id,
    details: parsed.data,
  });

  return NextResponse.json({
    settings: {
      country: settings.defaultCountry,
      region: settings.defaultRegion,
      city: settings.defaultCity,
      timeZone: settings.timeZone,
      locale: settings.locale,
    },
  });
}
