import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { createCustomField, listCustomFields } from "@/lib/crm/custom-fields-admin";
import { createLeadSource, listLeadSources } from "@/lib/crm/lead-sources-admin";
import { createLeadStage, listLeadStages } from "@/lib/crm/lead-stages-admin";
import {
  buildVerticalPresetSettingsPatch,
  getVerticalPreset,
  resolveStoredWorkspaceSettings,
  type DashboardCustomizationConfig,
  type IndustryPresetKey,
  type LeadPreviewCustomizationConfig,
  type NavigationCustomizationConfig,
  type WorkspaceOnboardingProfile,
  type WorkspaceAppearanceSettings,
} from "@/lib/crm/workspace-settings";
import { getDb } from "@/lib/db/client";
import { branches, companySettings, leadOpportunities, leads } from "@/lib/db/schema";

export async function getBranchCurrency(branchId?: string | null) {
  if (!branchId) {
    return null;
  }

  try {
    const db = getDb();
    const [branch] = await db
      .select({ currency: branches.currency })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);
    return branch?.currency?.trim().toUpperCase() || null;
  } catch {
    return null;
  }
}

export async function getCompanySettings() {
  try {
    const row = await ensureCompanySettingsRow();
    return resolveStoredWorkspaceSettings(row);
  } catch {
    return resolveStoredWorkspaceSettings(null);
  }
}

async function ensureCompanySettingsRow() {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(companySettings)
    .orderBy(asc(companySettings.createdAt))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db.insert(companySettings).values({}).returning();
  return created;
}

export async function updateCompanySettings(
  patch: Partial<WorkspaceAppearanceSettings> & {
    navigationConfig?: NavigationCustomizationConfig;
    dashboardConfig?: DashboardCustomizationConfig;
    leadPreviewConfig?: LeadPreviewCustomizationConfig;
    industryPreset?: IndustryPresetKey;
    onboardingCompletedAt?: Date | null;
    onboardingProfile?: WorkspaceOnboardingProfile | null;
    globalCurrency?: string;
    timeZone?: string;
    defaultCountry?: string | null;
    defaultRegion?: string | null;
    defaultCity?: string | null;
    locale?: string;
  },
) {
  const db = getDb();
  const row = await ensureCompanySettingsRow();

  await db
    .update(companySettings)
    .set({
      ...(patch.companyName !== undefined ? { companyName: patch.companyName } : {}),
      ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      ...(patch.logoUrlLightMode !== undefined ? { logoUrlLightMode: patch.logoUrlLightMode } : {}),
      ...(patch.logoUrlDarkMode !== undefined ? { logoUrlDarkMode: patch.logoUrlDarkMode } : {}),
      ...(patch.faviconUrl !== undefined ? { faviconUrl: patch.faviconUrl } : {}),
      ...(patch.loginLogoUrl !== undefined ? { loginLogoUrl: patch.loginLogoUrl } : {}),
      ...(patch.loginLogoUrlLightMode !== undefined
        ? { loginLogoUrlLightMode: patch.loginLogoUrlLightMode }
        : {}),
      ...(patch.loginLogoUrlDarkMode !== undefined
        ? { loginLogoUrlDarkMode: patch.loginLogoUrlDarkMode }
        : {}),
      ...(patch.primaryColor !== undefined ? { primaryColor: patch.primaryColor } : {}),
      ...(patch.accentColor !== undefined ? { accentColor: patch.accentColor } : {}),
      ...(patch.backgroundColor !== undefined ? { backgroundColor: patch.backgroundColor } : {}),
      ...(patch.surfaceColor !== undefined ? { surfaceColor: patch.surfaceColor } : {}),
      ...(patch.cardColor !== undefined ? { cardColor: patch.cardColor } : {}),
      ...(patch.sidebarColor !== undefined ? { sidebarColor: patch.sidebarColor } : {}),
      ...(patch.textColor !== undefined ? { textColor: patch.textColor } : {}),
      ...(patch.borderColor !== undefined ? { borderColor: patch.borderColor } : {}),
      ...(patch.borderRadius !== undefined ? { borderRadius: patch.borderRadius } : {}),
      ...(patch.fontScale !== undefined ? { fontScale: patch.fontScale.toFixed(2) } : {}),
      ...(patch.fontPreset !== undefined ? { fontPreset: patch.fontPreset } : {}),
      ...(patch.density !== undefined ? { density: patch.density } : {}),
      ...(patch.themeMode !== undefined ? { themeMode: patch.themeMode } : {}),
      ...(patch.designStyle !== undefined ? { designStyle: patch.designStyle } : {}),
      ...(patch.glassEnabled !== undefined ? { glassEnabled: patch.glassEnabled } : {}),
      ...(patch.glassOpacity !== undefined ? { glassOpacity: patch.glassOpacity } : {}),
      ...(patch.glassBlur !== undefined ? { glassBlur: patch.glassBlur } : {}),
      ...(patch.celebrationsEnabled !== undefined
        ? { celebrationsEnabled: patch.celebrationsEnabled }
        : {}),
      ...(patch.stageCelebrationsEnabled !== undefined
        ? { stageCelebrationsEnabled: patch.stageCelebrationsEnabled }
        : {}),
      ...(patch.targetCelebrationsEnabled !== undefined
        ? { targetCelebrationsEnabled: patch.targetCelebrationsEnabled }
        : {}),
      ...(patch.celebrationStyle !== undefined
        ? { celebrationStyle: patch.celebrationStyle }
        : {}),
      ...(patch.loginBackgroundUrl !== undefined
        ? { loginBackgroundUrl: patch.loginBackgroundUrl }
        : {}),
      ...(patch.loginHeadline !== undefined ? { loginHeadline: patch.loginHeadline } : {}),
      ...(patch.loginSubheadline !== undefined ? { loginSubheadline: patch.loginSubheadline } : {}),
      ...(patch.navigationConfig !== undefined
        ? { navigationConfig: patch.navigationConfig as unknown as Record<string, unknown> }
        : {}),
      ...(patch.dashboardConfig !== undefined
        ? { dashboardConfig: patch.dashboardConfig as unknown as Record<string, unknown> }
        : {}),
      ...(patch.leadPreviewConfig !== undefined
        ? { leadPreviewConfig: patch.leadPreviewConfig as unknown as Record<string, unknown> }
        : {}),
      ...(patch.industryPreset !== undefined ? { industryPreset: patch.industryPreset } : {}),
      ...(patch.onboardingCompletedAt !== undefined
        ? { onboardingCompletedAt: patch.onboardingCompletedAt }
        : {}),
      ...(patch.onboardingProfile !== undefined
        ? {
            onboardingProfile: patch.onboardingProfile as unknown as Record<
              string,
              unknown
            > | null,
          }
        : {}),
      ...(patch.globalCurrency !== undefined
        ? { globalCurrency: patch.globalCurrency.toUpperCase() }
        : {}),
      ...(patch.timeZone !== undefined ? { timeZone: patch.timeZone } : {}),
      ...(patch.defaultCountry !== undefined ? { defaultCountry: patch.defaultCountry } : {}),
      ...(patch.defaultRegion !== undefined ? { defaultRegion: patch.defaultRegion } : {}),
      ...(patch.defaultCity !== undefined ? { defaultCity: patch.defaultCity } : {}),
      ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
      updatedAt: new Date(),
    })
    .where(eq(companySettings.id, row.id));

  return getCompanySettings();
}

export async function applyVerticalPreset(
  key: IndustryPresetKey,
  options: { applyMissingDefaults?: boolean } = {},
) {
  const patch = buildVerticalPresetSettingsPatch(key);
  const updatedSettings = await updateCompanySettings(patch);

  if (!options.applyMissingDefaults) {
    return updatedSettings;
  }

  const preset = getVerticalPreset(key);
  const [existingStages, existingSources, existingCustomFields] = await Promise.all([
    listLeadStages(),
    listLeadSources(),
    listCustomFields(),
  ]);

  for (const [index, stageName] of preset.stageNames.entries()) {
    if (existingStages.some((stage) => stage.name.toLowerCase() === stageName.toLowerCase())) {
      continue;
    }

    await createLeadStage({
      name: stageName,
      sortOrder: index,
      isWon: stageName.toLowerCase() === "won",
      isLost: stageName.toLowerCase() === "lost",
    });
  }

  for (const sourceName of preset.sourceNames) {
    if (existingSources.some((source) => source.name.toLowerCase() === sourceName.toLowerCase())) {
      continue;
    }

    await createLeadSource({ name: sourceName });
  }

  for (const field of preset.recommendedCustomFields) {
    if (
      existingCustomFields.some(
        (current) => current.key === field.key || current.label.toLowerCase() === field.label.toLowerCase(),
      )
    ) {
      continue;
    }

    await createCustomField({
      label: field.label,
      key: field.key,
      type: field.type as never,
      showInForm: true,
      showInDetails: true,
      showInTable: ["budget", "interest", "property_type", "service_type"].includes(field.key),
    });
  }

  return updatedSettings;
}

const onboardingGoalWidgets = {
  capture: ["new_leads", "recent_leads", "top_sources"],
  follow_up: ["overdue_follow_ups", "my_tasks", "recent_leads"],
  pipeline: ["pipeline_value", "pipeline_overview", "target_progress"],
  reporting: ["conversion_rate", "won_value", "lead_trend"],
} as const;

function uniqueValues<T extends string>(values: readonly T[]) {
  return Array.from(new Set(values));
}

export async function completeWorkspaceOnboarding(input: {
  industryPreset: IndustryPresetKey;
  applyMissingDefaults: boolean;
  profile: WorkspaceOnboardingProfile;
}) {
  const settings = await applyVerticalPreset(input.industryPreset, {
    applyMissingDefaults: input.applyMissingDefaults,
  });
  const db = getDb();
  const [leadCount, opportunityCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(leads),
    db.select({ count: sql<number>`count(*)::int` }).from(leadOpportunities),
  ]);
  const canInitializeCurrency =
    !settings.onboardingCompletedAt &&
    Number(leadCount[0]?.count ?? 0) === 0 &&
    Number(opportunityCount[0]?.count ?? 0) === 0;
  const priorityWidgets = onboardingGoalWidgets[input.profile.primaryGoal];
  const hiddenWidgets = new Set(settings.dashboard.hiddenWidgets);

  for (const widget of priorityWidgets) {
    hiddenWidgets.delete(widget);
  }
  if (input.profile.teamSize === "solo") {
    hiddenWidgets.add("team_performance");
  } else {
    hiddenWidgets.delete("team_performance");
  }

  const scopeFields = input.profile.salesMotion === "multi_branch"
    ? (["branch", "owner"] as const)
    : input.profile.salesMotion === "team"
      ? (["team", "owner"] as const)
      : (["owner"] as const);

  return updateCompanySettings({
    dashboardConfig: {
      ...settings.dashboard,
      widgetOrder: uniqueValues([
        ...priorityWidgets,
        ...settings.dashboard.widgetOrder,
      ]),
      hiddenWidgets: Array.from(hiddenWidgets),
    },
    leadPreviewConfig: {
      ...settings.leadPreview,
      desktopColumns: uniqueValues([
        ...settings.leadPreview.desktopColumns,
        ...scopeFields,
      ]),
      mobileFields: uniqueValues([
        ...settings.leadPreview.mobileFields.slice(0, 3),
        ...scopeFields,
        ...settings.leadPreview.mobileFields.slice(3),
      ]).slice(0, 6),
    },
    onboardingCompletedAt: new Date(),
    onboardingProfile: input.profile,
    ...(canInitializeCurrency ? { globalCurrency: input.profile.currency } : {}),
    timeZone: input.profile.timeZone,
    locale: input.profile.locale,
    defaultCountry: input.profile.country,
    defaultRegion: input.profile.region || null,
    defaultCity: input.profile.city || null,
  });
}
