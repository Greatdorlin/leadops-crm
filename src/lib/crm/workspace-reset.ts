import "server-only";

import { asc, eq } from "drizzle-orm";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";
import {
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_LEAD_PREVIEW_CONFIG,
  DEFAULT_NAVIGATION_CONFIG,
  DEFAULT_WORKSPACE_APPEARANCE,
} from "@/lib/crm/workspace-settings";
import { getDb } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";

export async function resetWorkspaceExperience(input: {
  actorEmail: string;
  actorUserId: string;
}) {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (transaction) => {
    let [settings] = await transaction
      .select({ id: companySettings.id })
      .from(companySettings)
      .orderBy(asc(companySettings.createdAt))
      .limit(1);

    if (!settings) {
      [settings] = await transaction.insert(companySettings).values({}).returning({ id: companySettings.id });
    }

    await transaction
      .update(companySettings)
      .set({
        logoUrl: DEFAULT_WORKSPACE_APPEARANCE.logoUrl,
        logoUrlLightMode: DEFAULT_WORKSPACE_APPEARANCE.logoUrlLightMode,
        logoUrlDarkMode: DEFAULT_WORKSPACE_APPEARANCE.logoUrlDarkMode,
        faviconUrl: DEFAULT_WORKSPACE_APPEARANCE.faviconUrl,
        loginLogoUrl: DEFAULT_WORKSPACE_APPEARANCE.loginLogoUrl,
        loginLogoUrlLightMode: DEFAULT_WORKSPACE_APPEARANCE.loginLogoUrlLightMode,
        loginLogoUrlDarkMode: DEFAULT_WORKSPACE_APPEARANCE.loginLogoUrlDarkMode,
        primaryColor: DEFAULT_WORKSPACE_APPEARANCE.primaryColor,
        accentColor: DEFAULT_WORKSPACE_APPEARANCE.accentColor,
        backgroundColor: DEFAULT_WORKSPACE_APPEARANCE.backgroundColor,
        surfaceColor: DEFAULT_WORKSPACE_APPEARANCE.surfaceColor,
        cardColor: DEFAULT_WORKSPACE_APPEARANCE.cardColor,
        sidebarColor: DEFAULT_WORKSPACE_APPEARANCE.sidebarColor,
        textColor: DEFAULT_WORKSPACE_APPEARANCE.textColor,
        borderColor: DEFAULT_WORKSPACE_APPEARANCE.borderColor,
        borderRadius: DEFAULT_WORKSPACE_APPEARANCE.borderRadius,
        fontScale: DEFAULT_WORKSPACE_APPEARANCE.fontScale.toFixed(2),
        fontPreset: DEFAULT_WORKSPACE_APPEARANCE.fontPreset,
        density: DEFAULT_WORKSPACE_APPEARANCE.density,
        themeMode: DEFAULT_WORKSPACE_APPEARANCE.themeMode,
        designStyle: DEFAULT_WORKSPACE_APPEARANCE.designStyle,
        glassEnabled: DEFAULT_WORKSPACE_APPEARANCE.glassEnabled,
        glassOpacity: DEFAULT_WORKSPACE_APPEARANCE.glassOpacity,
        glassBlur: DEFAULT_WORKSPACE_APPEARANCE.glassBlur,
        celebrationsEnabled: DEFAULT_WORKSPACE_APPEARANCE.celebrationsEnabled,
        stageCelebrationsEnabled: DEFAULT_WORKSPACE_APPEARANCE.stageCelebrationsEnabled,
        targetCelebrationsEnabled: DEFAULT_WORKSPACE_APPEARANCE.targetCelebrationsEnabled,
        celebrationStyle: DEFAULT_WORKSPACE_APPEARANCE.celebrationStyle,
        loginBackgroundUrl: DEFAULT_WORKSPACE_APPEARANCE.loginBackgroundUrl,
        loginHeadline: DEFAULT_WORKSPACE_APPEARANCE.loginHeadline,
        loginSubheadline: DEFAULT_WORKSPACE_APPEARANCE.loginSubheadline,
        navigationConfig: { ...DEFAULT_NAVIGATION_CONFIG },
        dashboardConfig: { ...DEFAULT_DASHBOARD_CONFIG },
        leadPreviewConfig: { ...DEFAULT_LEAD_PREVIEW_CONFIG },
        industryPreset: "general_business",
        updatedAt: now,
      })
      .where(eq(companySettings.id, settings.id));

    await recordWorkspaceAuditEvent({
      eventType: "workspace.experience_reset",
      actorEmail: input.actorEmail,
      actorUserId: input.actorUserId,
      targetType: "workspace",
      targetId: settings.id,
      details: {
        reset: ["appearance", "login_branding", "navigation", "dashboard", "lead_preview", "industry_preset"],
        preserved: ["leads", "users", "forms", "integrations", "currency", "authentication", "registration_policy"],
      },
    }, transaction);
  });
}
