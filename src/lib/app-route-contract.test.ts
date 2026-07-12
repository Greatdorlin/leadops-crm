import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { appRoutes } from "@/lib/app-routes";

const cleanPageRoutes = [
  appRoutes.dashboard,
  appRoutes.leads,
  appRoutes.leadsTrash,
  appRoutes.tasks,
  appRoutes.team,
  appRoutes.reports,
  appRoutes.notifications,
  appRoutes.intake,
  appRoutes.forms,
  appRoutes.formsNew,
  appRoutes.profile,
  appRoutes.settings,
  appRoutes.settingsAppearance,
  appRoutes.settingsDashboard,
  appRoutes.settingsFields,
  appRoutes.settingsFormSources,
  appRoutes.settingsIndustry,
  appRoutes.settingsLeadPreview,
  appRoutes.settingsNavigation,
  appRoutes.settingsSalesTargets,
  appRoutes.settingsSources,
  appRoutes.settingsStages,
  appRoutes.settingsSystemStatus,
  appRoutes.settingsCurrency,
  appRoutes.settingsBranches,
  appRoutes.settingsTeam,
  appRoutes.settingsRolePermissions,
  appRoutes.integrations,
  appRoutes.integration("facebook"),
  appRoutes.integration("google-ads"),
  appRoutes.integration("google-sheets"),
  appRoutes.integration("linkedin"),
  appRoutes.integration("tiktok"),
] as const;

test("every clean workspace route has a Next.js page entry", () => {
  for (const route of cleanPageRoutes) {
    const pagePath = path.join(process.cwd(), "src", "app", ...route.split("/").filter(Boolean), "page.tsx");
    assert.equal(existsSync(pagePath), true, `${route} is missing ${pagePath}`);
  }
});
