import assert from "node:assert/strict";
import test from "node:test";
import {
  appearanceSettingsSchema,
  buildThemeCssVariables,
  buildVerticalPresetSettingsPatch,
  DASHBOARD_WIDGET_KEYS,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_LEAD_PREVIEW_CONFIG,
  DEFAULT_WORKSPACE_APPEARANCE,
  FONT_PRESETS,
  getDensityClass,
  getDesignStyleClass,
  getFontPresetVariables,
  getResolvedThemeSettings,
  resolveBrandLogo,
  resolveDashboardWidgetOrder,
  resolveLeadPreviewConfig,
  resolveNavigationItems,
  VERTICAL_PRESET_DEFINITIONS,
} from "@/lib/crm/workspace-settings";

test("theme settings resolve safely and generate CSS variables", () => {
  const themeFlags = getResolvedThemeSettings({
    companyName: "Acme Sales",
    primaryColor: "#112233",
    sidebarColor: "#050b18",
    borderRadius: 18,
    fontScale: 1.1,
    fontPreset: "editorial",
    density: "compact",
    glassEnabled: true,
    glassOpacity: 64,
    glassBlur: 22,
  });
  const variables = buildThemeCssVariables({
    ...DEFAULT_WORKSPACE_APPEARANCE,
    companyName: "Acme Sales",
    primaryColor: "#112233",
    sidebarColor: "#050b18",
    borderRadius: 18,
    fontScale: 1.1,
    fontPreset: "editorial",
    density: "compact",
    glassEnabled: true,
    glassOpacity: 64,
    glassBlur: 22,
  });

  assert.equal(themeFlags.themeMode, "dark");
  assert.equal(themeFlags.designStyle, "liquid_glass");
  assert.equal(themeFlags.density, "compact");
  assert.equal(themeFlags.fontPreset, "editorial");
  assert.equal(themeFlags.glassEnabled, true);
  assert.equal(getDesignStyleClass(themeFlags.designStyle), "admin-style-liquid_glass");
  assert.equal(getDensityClass(themeFlags.density), "admin-density-compact");
  assert.equal(variables["--color-primary"], "#112233");
  assert.equal(variables["--color-sidebar"], "#050b18");
  assert.equal(variables["--ld-color-primary"], "#112233");
  assert.equal(variables["--ld-color-sidebar"], "color-mix(in srgb, #050b18 84%, transparent)");
  assert.equal(variables["--radius-ui"], "18px");
  assert.equal(variables["--font-scale"], "1.1");
  assert.equal(variables["--ld-font-scale"], "1.1");
  assert.equal(variables["--font-heading"], getFontPresetVariables("editorial").heading);
  assert.equal(variables["--font-body"], getFontPresetVariables("editorial").body);
  assert.equal(variables["--density-scale"], "0.92");
  assert.equal(variables["--glass-opacity"], "0.64");
  assert.equal(variables["--glass-blur"], "22px");
  assert.equal(variables["--ld-glass-opacity"], "0.64");
  assert.equal(variables["--ld-glass-blur"], "22px");
  assert.equal(variables["--ld-background-image"], 'url("/backgrounds/bg-butterfly-glass.png")');
});

test("appearance settings validation rejects malformed colors and keeps concise login copy", () => {
  const valid = appearanceSettingsSchema.safeParse({
    companyName: "Leads Desk",
    primaryColor: "#123abc",
    accentColor: "#f4b400",
    backgroundColor: "#f6efe6",
    surfaceColor: "#ffffff",
    cardColor: "#ffffff",
    sidebarColor: "#0b1438",
    textColor: "#0f172a",
    borderColor: "#d8e2f0",
    borderRadius: 24,
    fontScale: 1,
    fontPreset: "brand",
    density: "comfortable",
    themeMode: "light",
    designStyle: "modern",
    glassEnabled: false,
    glassOpacity: 72,
    glassBlur: 18,
    celebrationsEnabled: true,
    stageCelebrationsEnabled: true,
    targetCelebrationsEnabled: true,
    loginHeadline: "Welcome back",
    loginSubheadline: "Manage leads in one private workspace.",
    loginBackgroundUrl: "/backgrounds/bg-dark-luxury.png",
  });
  const invalid = appearanceSettingsSchema.safeParse({
    ...DEFAULT_WORKSPACE_APPEARANCE,
    borderRadius: 4,
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("logo resolution and font presets stay runtime safe", () => {
  assert.deepEqual(FONT_PRESETS.includes("brand"), true);
  assert.equal(
    appearanceSettingsSchema.safeParse({
      ...DEFAULT_WORKSPACE_APPEARANCE,
      logoUrl: "data:image/png;base64,aGVsbG8=",
      loginBackgroundUrl: "data:image/webp;base64,aGVsbG8=",
    }).success,
    true,
  );
  assert.equal(
    resolveBrandLogo({
      logoUrl: "https://example.com/default.png",
      logoUrlLightMode: "https://example.com/light.png",
      logoUrlDarkMode: "https://example.com/dark.png",
      surfaceMode: "dark",
    }),
    "https://example.com/dark.png",
  );
  assert.equal(
    resolveBrandLogo({
      logoUrl: "https://example.com/default.png",
      logoUrlLightMode: "https://example.com/light.png",
      surfaceMode: "light",
    }),
    "https://example.com/light.png",
  );
});

test("navigation customization keeps required items visible and ordered", () => {
  const items = resolveNavigationItems(
    [
      { key: "dashboard", label: "Dashboard" },
      { key: "leads", label: "Leads" },
      { key: "tasks", label: "Tasks" },
      { key: "settings", label: "Settings" },
    ],
    {
      items: [
        { key: "settings", visible: false, order: 3, label: "Setup" },
        { key: "dashboard", visible: false, order: 2 },
        { key: "leads", order: 0, label: "Pipeline" },
        { key: "tasks", visible: false, order: 1 },
      ],
    },
  );

  assert.deepEqual(
    items.map((item) => ({ key: item.key, label: item.label })),
    [
      { key: "leads", label: "Pipeline" },
      { key: "dashboard", label: "Dashboard" },
      { key: "settings", label: "Setup" },
    ],
  );
});

test("lead preview config filters duplicates and archived custom fields", () => {
  const preview = resolveLeadPreviewConfig(
    {
      desktopColumns: ["name", "source", "source", "custom:field-1", "custom:field-2"],
      mobileFields: ["name", "custom:field-2", "custom:field-1"],
      maxCustomFieldColumns: 6,
    },
    [
      { id: "field-1", archived: false, showInTable: true },
      { id: "field-2", archived: true, showInTable: true },
    ],
  );

  assert.deepEqual(preview.desktopColumns, ["name", "source", "custom:field-1"]);
  assert.deepEqual(preview.mobileFields, ["name", "custom:field-1"]);
  assert.equal(preview.maxCustomFieldColumns, 6);
});

test("dashboard widget config resolves hidden widgets and saved order", () => {
  const ordered = resolveDashboardWidgetOrder(
    DASHBOARD_WIDGET_KEYS.map((id) => ({ id })),
    {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgetOrder: ["won_value", "pipeline_value", ...DASHBOARD_WIDGET_KEYS.filter((key) => !["won_value", "pipeline_value"].includes(key))],
      hiddenWidgets: ["team_performance", "recent_intake"],
    },
  );

  assert.deepEqual(
    ordered.map((item) => item.id).slice(0, 3),
    ["won_value", "pipeline_value", "total_leads"],
  );
  assert.equal(ordered.some((item) => item.id === "team_performance"), false);
  assert.equal(ordered.some((item) => item.id === "recent_intake"), false);
});

test("vertical preset payloads stay runtime-safe and additive-first", () => {
  const preset = VERTICAL_PRESET_DEFINITIONS.real_estate;
  const patch = buildVerticalPresetSettingsPatch("real_estate");

  assert.equal(preset.label, "Real Estate");
  assert.equal(preset.recommendedCustomFields.length > 0, true);
  assert.deepEqual(patch.dashboardConfig.widgetOrder, preset.dashboardWidgets);
  assert.deepEqual(patch.leadPreviewConfig.desktopColumns, preset.leadPreviewDefaults);
  assert.equal("companyName" in patch, false);
  assert.deepEqual(DEFAULT_LEAD_PREVIEW_CONFIG.desktopColumns.includes("stage"), true);
});
