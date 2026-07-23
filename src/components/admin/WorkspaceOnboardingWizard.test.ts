import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIndustryPresetPayload,
  getOnboardingImpact,
  getRecommendedSetupDepth,
} from "./WorkspaceOnboardingWizard";
import { VERTICAL_PRESET_DEFINITIONS } from "@/lib/crm/workspace-settings";

test("new workspaces receive the additive complete setup recommendation", () => {
  assert.equal(getRecommendedSetupDepth("new"), "complete");
  assert.equal(getRecommendedSetupDepth("existing"), "layout");
});

test("setup depth maps to the real preset API payload", () => {
  const profile = {
    industryPresetId: "general_business",
    teamSize: "small" as const,
    primaryGoal: "pipeline" as const,
    salesMotion: "team" as const,
    country: "Nigeria",
    region: "Lagos",
    city: "Lagos",
    timeZone: "Africa/Lagos",
    currency: "NGN",
    locale: "en-NG",
  };
  assert.deepEqual(buildIndustryPresetPayload("real_estate", "complete", profile), {
    industryPreset: "real_estate",
    applyMissingDefaults: true,
    profile: { ...profile, industryPresetId: "real_estate" },
  });
  assert.deepEqual(buildIndustryPresetPayload("real_estate", "layout", profile), {
    industryPreset: "real_estate",
    applyMissingDefaults: false,
    profile: { ...profile, industryPresetId: "real_estate" },
  });
});

test("layout-only preview does not claim workflow records will be added", () => {
  const preset = VERTICAL_PRESET_DEFINITIONS.real_estate;
  const layoutImpact = getOnboardingImpact(preset, "layout");
  const completeImpact = getOnboardingImpact(preset, "complete");

  assert.equal(layoutImpact.stages, 0);
  assert.equal(layoutImpact.sources, 0);
  assert.equal(layoutImpact.customFields, 0);
  assert.equal(completeImpact.stages, preset.stageNames.length);
  assert.equal(completeImpact.sources, preset.sourceNames.length);
  assert.equal(completeImpact.customFields, preset.recommendedCustomFields.length);
  assert.equal(layoutImpact.dashboardWidgets, preset.dashboardWidgets.length);
  assert.equal(layoutImpact.leadPreviewFields, preset.leadPreviewDefaults.length);
});
