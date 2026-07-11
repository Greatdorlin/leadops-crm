import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import {
  getVerticalPreset,
  industryPresetSchema,
} from "@/lib/crm/workspace-settings";
import {
  applyVerticalPreset,
  getCompanySettings,
} from "@/lib/crm/workspace-settings-server";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getCompanySettings();
  const preset = getVerticalPreset(settings.industryPreset);
  return NextResponse.json({ industryPreset: settings.industryPreset, preset });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageIndustryPresets(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = industryPresetSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Industry preset is invalid." },
      { status: 400 },
    );
  }

  const settings = await applyVerticalPreset(parsed.data.industryPreset, {
    applyMissingDefaults: parsed.data.applyMissingDefaults,
  });

  return NextResponse.json({
    industryPreset: settings.industryPreset,
    preset: getVerticalPreset(settings.industryPreset),
  });
}
