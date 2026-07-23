import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import {
  industryPresetSchema,
  workspaceOnboardingProfileSchema,
} from "@/lib/crm/workspace-settings";
import {
  completeWorkspaceOnboarding,
  getCompanySettings,
} from "@/lib/crm/workspace-settings-server";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";

const onboardingSchema = industryPresetSchema.extend({
  profile: workspaceOnboardingProfileSchema,
});

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIndustryPresets(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const settings = await getCompanySettings();
  return NextResponse.json({
    completedAt: settings.onboardingCompletedAt,
    profile: settings.onboardingProfile,
    industryPreset: settings.industryPreset,
  });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIndustryPresets(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Workspace setup is invalid." },
      { status: 400 },
    );
  }

  try {
    const settings = await completeWorkspaceOnboarding({
      industryPreset: parsed.data.industryPreset,
      applyMissingDefaults: parsed.data.applyMissingDefaults,
      profile: parsed.data.profile,
    });
    await recordWorkspaceAuditEvent({
      eventType: "workspace.onboarding_completed",
      actorEmail: context.session.user?.email ?? "unknown",
      actorUserId: context.crmUser?.id,
      targetType: "company_settings",
      targetId: settings.id,
      details: {
        industryPreset: settings.industryPreset,
        applyMissingDefaults: parsed.data.applyMissingDefaults,
        profile: settings.onboardingProfile,
      },
    });

    return NextResponse.json({
      completedAt: settings.onboardingCompletedAt,
      profile: settings.onboardingProfile,
      industryPreset: settings.industryPreset,
    });
  } catch (error) {
    console.error("[workspace-onboarding:complete]", error);
    return NextResponse.json(
      { error: "Workspace setup could not be completed." },
      { status: 500 },
    );
  }
}
