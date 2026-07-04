import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageCurrencySettings } from "@/lib/crm/authz";
import {
  currencySettingsSchema,
  getCompanySettings,
  updateCompanySettings,
} from "@/lib/crm/workspace-settings";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getCompanySettings();
  return NextResponse.json({ settings: { globalCurrency: settings.globalCurrency } });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageCurrencySettings({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = currencySettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Currency settings are invalid." },
      { status: 400 },
    );
  }

  const settings = await updateCompanySettings({ globalCurrency: parsed.data.globalCurrency });
  return NextResponse.json({ settings: { globalCurrency: settings.globalCurrency } });
}
