import "server-only";

import { asc, eq } from "drizzle-orm";
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
  type WorkspaceAppearanceSettings,
} from "@/lib/crm/workspace-settings";
import { getDb } from "@/lib/db/client";
import { branches, companySettings } from "@/lib/db/schema";

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
    const db = getDb();
    const [row] = await db
      .select()
      .from(companySettings)
      .orderBy(asc(companySettings.createdAt))
      .limit(1);
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
    globalCurrency?: string;
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
      ...(patch.globalCurrency !== undefined
        ? { globalCurrency: patch.globalCurrency.toUpperCase() }
        : {}),
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
