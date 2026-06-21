import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";
import type { CustomFieldDefinition } from "@/lib/crm/domain";
import { createCustomField, listCustomFields } from "@/lib/crm/custom-fields-admin";
import { createLeadSource, listLeadSources } from "@/lib/crm/lead-sources-admin";
import { createLeadStage, listLeadStages } from "@/lib/crm/lead-stages-admin";

export const THEME_MODES = ["light", "dark", "system"] as const;
export const DESIGN_STYLES = ["modern", "classic", "compact", "liquid_glass"] as const;
export const DENSITY_OPTIONS = ["comfortable", "compact"] as const;
export const FONT_PRESETS = ["brand", "system_sans", "editorial", "compact"] as const;
export const INDUSTRY_PRESETS = [
  "general_business",
  "real_estate",
  "insurance",
  "travel_education_agency",
  "service_business",
  "training_coaching",
  "healthcare_clinic",
  "legal_professional_services",
] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type DesignStyle = (typeof DESIGN_STYLES)[number];
export type DensityOption = (typeof DENSITY_OPTIONS)[number];
export type FontPreset = (typeof FONT_PRESETS)[number];
export type IndustryPresetKey = (typeof INDUSTRY_PRESETS)[number];

export const CORE_LEAD_PREVIEW_FIELDS = [
  "name",
  "phone",
  "email",
  "company",
  "customer_type",
  "source",
  "stage",
  "owner",
  "priority",
  "next_follow_up",
  "follow_up_status",
  "estimated_value",
  "expected_close_date",
  "created_date",
  "last_activity",
  "campaign",
  "team",
  "branch",
  "department",
] as const;

export const DASHBOARD_WIDGET_KEYS = [
  "total_leads",
  "new_leads",
  "leads_this_month",
  "overdue_follow_ups",
  "pipeline_value",
  "won_value",
  "conversion_rate",
  "top_sources",
  "recent_intake",
  "team_performance",
  "target_progress",
  "my_tasks",
] as const;

export const NAVIGATION_ITEM_KEYS = [
  "dashboard",
  "leads",
  "tasks",
  "team",
  "reports",
  "notifications",
  "integrations",
  "settings",
] as const;

export type NavigationItemKey = (typeof NAVIGATION_ITEM_KEYS)[number];
export type DashboardWidgetKey = (typeof DASHBOARD_WIDGET_KEYS)[number];
export type CoreLeadPreviewField = (typeof CORE_LEAD_PREVIEW_FIELDS)[number];
export type LeadPreviewFieldKey = CoreLeadPreviewField | `custom:${string}`;

export interface NavigationItemPreference {
  key: NavigationItemKey;
  label?: string | null;
  visible?: boolean;
  order?: number;
}

export interface NavigationCustomizationConfig {
  items: NavigationItemPreference[];
}

export interface DashboardCustomizationConfig {
  widgetOrder: DashboardWidgetKey[];
  hiddenWidgets: DashboardWidgetKey[];
  defaultPeriod: "30d" | "this_month" | "quarter";
}

export interface LeadPreviewCustomizationConfig {
  desktopColumns: LeadPreviewFieldKey[];
  mobileFields: LeadPreviewFieldKey[];
  maxCustomFieldColumns: number;
}

export interface WorkspaceAppearanceSettings {
  companyName: string;
  logoUrl: string | null;
  logoUrlLightMode: string | null;
  logoUrlDarkMode: string | null;
  faviconUrl: string | null;
  loginLogoUrl: string | null;
  loginLogoUrlLightMode: string | null;
  loginLogoUrlDarkMode: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  sidebarColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  fontScale: number;
  fontPreset: FontPreset;
  density: DensityOption;
  themeMode: ThemeMode;
  designStyle: DesignStyle;
  glassEnabled: boolean;
  glassOpacity: number;
  glassBlur: number;
  celebrationsEnabled: boolean;
  stageCelebrationsEnabled: boolean;
  targetCelebrationsEnabled: boolean;
  loginBackgroundUrl: string | null;
  loginHeadline: string;
  loginSubheadline: string;
}

export interface ResolvedWorkspaceSettings extends WorkspaceAppearanceSettings {
  id: string | null;
  navigation: NavigationCustomizationConfig;
  dashboard: DashboardCustomizationConfig;
  leadPreview: LeadPreviewCustomizationConfig;
  industryPreset: IndustryPresetKey;
}

export interface VerticalPresetDefinition {
  key: IndustryPresetKey;
  label: string;
  description: string;
  stageNames: string[];
  sourceNames: string[];
  recommendedCustomFields: Array<{ key: string; label: string; type: string }>;
  leadPreviewDefaults: LeadPreviewFieldKey[];
  mobilePreviewDefaults: LeadPreviewFieldKey[];
  dashboardWidgets: DashboardWidgetKey[];
}

const requiredNavigationKeys = new Set<NavigationItemKey>(["dashboard", "leads", "settings"]);

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const urlOrRootPathSchema = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value.length === 0) {
        return true;
      }

      if (value.startsWith("/")) {
        return !value.startsWith("//");
      }

      if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value)) {
        return true;
      }

      return z.string().url().safeParse(value).success;
    }, `${label} must be a valid image upload, URL, or root-relative path.`);

function normalizeDisplayString(value: unknown, fallback: string) {
  return normalizeOptionalString(value) ?? fallback;
}

export const DEFAULT_NAVIGATION_CONFIG: NavigationCustomizationConfig = {
  items: NAVIGATION_ITEM_KEYS.map((key, index) => ({
    key,
    order: index,
    visible: true,
  })),
};

export const DEFAULT_DASHBOARD_CONFIG: DashboardCustomizationConfig = {
  widgetOrder: [...DASHBOARD_WIDGET_KEYS],
  hiddenWidgets: [],
  defaultPeriod: "30d",
};

export const DEFAULT_LEAD_PREVIEW_CONFIG: LeadPreviewCustomizationConfig = {
  desktopColumns: [
    "name",
    "source",
    "stage",
    "owner",
    "priority",
    "next_follow_up",
    "estimated_value",
  ],
  mobileFields: ["name", "source", "stage", "owner", "next_follow_up"],
  maxCustomFieldColumns: 4,
};

export const DEFAULT_WORKSPACE_APPEARANCE: WorkspaceAppearanceSettings = {
  companyName: "Leads Desk",
  logoUrl: null,
  logoUrlLightMode: null,
  logoUrlDarkMode: null,
  faviconUrl: null,
  loginLogoUrl: null,
  loginLogoUrlLightMode: null,
  loginLogoUrlDarkMode: null,
  primaryColor: "#3b82f6",
  accentColor: "#8b5cf6",
  backgroundColor: "#0a0a0f",
  surfaceColor: "#12121a",
  cardColor: "#111827",
  sidebarColor: "#080b14",
  textColor: "#ffffff",
  borderColor: "#273449",
  borderRadius: 20,
  fontScale: 1,
  fontPreset: "brand",
  density: "comfortable",
  themeMode: "dark",
  designStyle: "liquid_glass",
  glassEnabled: true,
  glassOpacity: 60,
  glassBlur: 20,
  celebrationsEnabled: true,
  stageCelebrationsEnabled: true,
  targetCelebrationsEnabled: true,
  loginBackgroundUrl: "/backgrounds/bg-butterfly-glass.png",
  loginHeadline: "Welcome back",
  loginSubheadline:
    "Manage leads, follow-ups, and sales performance in one private workspace.",
};

export const VERTICAL_PRESET_DEFINITIONS: Record<IndustryPresetKey, VerticalPresetDefinition> = {
  general_business: {
    key: "general_business",
    label: "General Business",
    description: "Balanced defaults for most sales teams.",
    stageNames: ["New", "Contacted", "Follow-up", "Qualified", "Proposal", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Call", "Walk-in", "CSV Import", "Manual Entry"],
    recommendedCustomFields: [
      { key: "budget", label: "Budget", type: "currency" },
      { key: "interest", label: "Interest", type: "text" },
      { key: "urgency", label: "Urgency", type: "select" },
    ],
    leadPreviewDefaults: [...DEFAULT_LEAD_PREVIEW_CONFIG.desktopColumns],
    mobilePreviewDefaults: [...DEFAULT_LEAD_PREVIEW_CONFIG.mobileFields],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  real_estate: {
    key: "real_estate",
    label: "Real Estate",
    description: "Property inquiries, location, and budget-friendly pipeline defaults.",
    stageNames: ["New Inquiry", "Contacted", "Inspection Scheduled", "Interested", "Offer", "Won", "Lost"],
    sourceNames: ["Website", "Facebook Ads", "Instagram", "Referral", "Call", "Walk-in"],
    recommendedCustomFields: [
      { key: "property_type", label: "Property Type", type: "select" },
      { key: "budget", label: "Budget", type: "currency" },
      { key: "preferred_location", label: "Preferred Location", type: "text" },
    ],
    leadPreviewDefaults: ["name", "phone", "source", "stage", "owner", "estimated_value", "expected_close_date"],
    mobilePreviewDefaults: ["name", "source", "stage", "owner", "estimated_value"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  insurance: {
    key: "insurance",
    label: "Insurance",
    description: "Quote and renewal-driven defaults for policy teams.",
    stageNames: ["New Prospect", "Contacted", "Needs Review", "Quote Sent", "Policy Started", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Call", "CSV Import", "Manual Entry", "Other"],
    recommendedCustomFields: [
      { key: "policy_type", label: "Policy Type", type: "select" },
      { key: "coverage_amount", label: "Coverage Amount", type: "currency" },
      { key: "renewal_date", label: "Renewal Date", type: "date" },
    ],
    leadPreviewDefaults: ["name", "phone", "source", "stage", "owner", "next_follow_up", "estimated_value"],
    mobilePreviewDefaults: ["name", "stage", "owner", "next_follow_up"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  travel_education_agency: {
    key: "travel_education_agency",
    label: "Travel / Education Agency",
    description: "Keeps this vertical available without exposing old pathway branding.",
    stageNames: ["New Inquiry", "Contacted", "Consultation Booked", "Documents Pending", "Application Started", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Call", "Walk-in", "Manual Entry", "Other"],
    recommendedCustomFields: [
      { key: "destination", label: "Destination", type: "text" },
      { key: "program_level", label: "Program Level", type: "text" },
      { key: "timeline", label: "Timeline", type: "text" },
    ],
    leadPreviewDefaults: ["name", "phone", "source", "stage", "owner", "next_follow_up", "created_date"],
    mobilePreviewDefaults: ["name", "stage", "owner", "next_follow_up"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  service_business: {
    key: "service_business",
    label: "Service Business",
    description: "Best for booking-heavy service teams.",
    stageNames: ["New Request", "Contacted", "Estimate Sent", "Job Scheduled", "Completed", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Call", "Walk-in", "Manual Entry", "Other"],
    recommendedCustomFields: [
      { key: "service_type", label: "Service Type", type: "select" },
      { key: "location", label: "Location", type: "text" },
      { key: "preferred_appointment_date", label: "Preferred Appointment Date", type: "date" },
    ],
    leadPreviewDefaults: ["name", "phone", "source", "stage", "owner", "next_follow_up", "expected_close_date"],
    mobilePreviewDefaults: ["name", "stage", "owner", "next_follow_up"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  training_coaching: {
    key: "training_coaching",
    label: "Training / Coaching",
    description: "Enrollment and schedule-oriented defaults.",
    stageNames: ["New Inquiry", "Contacted", "Class Recommended", "Payment Pending", "Enrolled", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Manual Entry", "CSV Import", "Instagram", "Other"],
    recommendedCustomFields: [
      { key: "course_interest", label: "Course Interest", type: "text" },
      { key: "preferred_schedule", label: "Preferred Schedule", type: "text" },
      { key: "learning_goal", label: "Learning Goal", type: "textarea" },
    ],
    leadPreviewDefaults: ["name", "email", "source", "stage", "owner", "next_follow_up", "created_date"],
    mobilePreviewDefaults: ["name", "stage", "owner", "next_follow_up"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  healthcare_clinic: {
    key: "healthcare_clinic",
    label: "Healthcare / Clinic",
    description: "Patient inquiry-friendly defaults with scheduling context.",
    stageNames: ["New Inquiry", "Contacted", "Appointment Booked", "Follow-up", "Completed", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Call", "Walk-in", "Manual Entry", "Other"],
    recommendedCustomFields: [
      { key: "service_needed", label: "Service Needed", type: "text" },
      { key: "preferred_visit_date", label: "Preferred Visit Date", type: "date" },
      { key: "urgency", label: "Urgency", type: "select" },
    ],
    leadPreviewDefaults: ["name", "phone", "source", "stage", "owner", "next_follow_up", "created_date"],
    mobilePreviewDefaults: ["name", "stage", "owner", "next_follow_up"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
  legal_professional_services: {
    key: "legal_professional_services",
    label: "Legal / Professional Services",
    description: "Intake and consultation defaults for advisory teams.",
    stageNames: ["New Inquiry", "Contacted", "Consultation Booked", "Proposal Sent", "Engaged", "Won", "Lost"],
    sourceNames: ["Website", "Referral", "Call", "Manual Entry", "CSV Import", "Other"],
    recommendedCustomFields: [
      { key: "service_area", label: "Service Area", type: "text" },
      { key: "case_priority", label: "Case Priority", type: "select" },
      { key: "consultation_date", label: "Consultation Date", type: "date" },
    ],
    leadPreviewDefaults: ["name", "email", "source", "stage", "owner", "estimated_value", "next_follow_up"],
    mobilePreviewDefaults: ["name", "stage", "owner", "next_follow_up"],
    dashboardWidgets: [...DEFAULT_DASHBOARD_CONFIG.widgetOrder],
  },
};

export const appearanceSettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  logoUrl: urlOrRootPathSchema("Logo URL").optional().nullable(),
  logoUrlLightMode: urlOrRootPathSchema("Light mode logo URL").optional().nullable(),
  logoUrlDarkMode: urlOrRootPathSchema("Dark mode logo URL").optional().nullable(),
  faviconUrl: urlOrRootPathSchema("Favicon URL").optional().nullable(),
  loginLogoUrl: urlOrRootPathSchema("Login logo URL").optional().nullable(),
  loginLogoUrlLightMode: urlOrRootPathSchema("Light mode login logo URL").optional().nullable(),
  loginLogoUrlDarkMode: urlOrRootPathSchema("Dark mode login logo URL").optional().nullable(),
  primaryColor: z.string().trim(),
  accentColor: z.string().trim(),
  backgroundColor: z.string().trim(),
  surfaceColor: z.string().trim(),
  cardColor: z.string().trim(),
  sidebarColor: z.string().trim(),
  textColor: z.string().trim(),
  borderColor: z.string().trim(),
  borderRadius: z.coerce.number().int().min(8).max(40),
  fontScale: z.coerce.number().min(0.9).max(1.15),
  fontPreset: z.enum(FONT_PRESETS),
  density: z.enum(DENSITY_OPTIONS),
  themeMode: z.enum(THEME_MODES),
  designStyle: z.enum(DESIGN_STYLES),
  glassEnabled: z.boolean(),
  glassOpacity: z.coerce.number().int().min(0).max(100),
  glassBlur: z.coerce.number().int().min(0).max(30),
  celebrationsEnabled: z.boolean(),
  stageCelebrationsEnabled: z.boolean(),
  targetCelebrationsEnabled: z.boolean(),
  loginBackgroundUrl: urlOrRootPathSchema("Login background URL").optional().nullable(),
  loginHeadline: z.string().trim().min(1, "Login headline is required."),
  loginSubheadline: z.string().trim().min(1, "Login subheadline is required."),
});

export const navigationSettingsSchema = z.object({
  items: z.array(
    z.object({
      key: z.enum(NAVIGATION_ITEM_KEYS),
      label: z.string().trim().optional().nullable(),
      visible: z.boolean().optional(),
      order: z.coerce.number().int().min(0).max(99).optional(),
    }),
  ),
});

export const dashboardCustomizationSchema = z.object({
  widgetOrder: z.array(z.enum(DASHBOARD_WIDGET_KEYS)),
  hiddenWidgets: z.array(z.enum(DASHBOARD_WIDGET_KEYS)),
  defaultPeriod: z.enum(["30d", "this_month", "quarter"]),
});

export const leadPreviewCustomizationSchema = z.object({
  desktopColumns: z.array(z.string()),
  mobileFields: z.array(z.string()),
  maxCustomFieldColumns: z.coerce.number().int().min(1).max(8),
});

export const industryPresetSchema = z.object({
  industryPreset: z.enum(INDUSTRY_PRESETS),
  applyMissingDefaults: z.boolean().optional().default(false),
});

function parseNavigationConfig(raw: unknown): NavigationCustomizationConfig {
  const parsed = navigationSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_NAVIGATION_CONFIG;
  }

  return {
    items: NAVIGATION_ITEM_KEYS.map((key, index) => {
      const next = parsed.data.items.find((item) => item.key === key);
      return {
        key,
        label: next?.label ?? null,
        visible: next?.visible ?? true,
        order: next?.order ?? index,
      };
    }),
  };
}

function parseDashboardConfig(raw: unknown): DashboardCustomizationConfig {
  const parsed = dashboardCustomizationSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_DASHBOARD_CONFIG;
  }

  const widgetOrder = [
    ...parsed.data.widgetOrder.filter((key, index, list) => list.indexOf(key) === index),
    ...DASHBOARD_WIDGET_KEYS.filter((key) => !parsed.data.widgetOrder.includes(key)),
  ];

  return {
    widgetOrder,
    hiddenWidgets: parsed.data.hiddenWidgets.filter((key, index, list) => list.indexOf(key) === index),
    defaultPeriod: parsed.data.defaultPeriod,
  };
}

function parseLeadPreviewConfig(raw: unknown): LeadPreviewCustomizationConfig {
  const parsed = leadPreviewCustomizationSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_LEAD_PREVIEW_CONFIG;
  }

  return {
    desktopColumns: parsed.data.desktopColumns as LeadPreviewFieldKey[],
    mobileFields: parsed.data.mobileFields as LeadPreviewFieldKey[],
    maxCustomFieldColumns: parsed.data.maxCustomFieldColumns,
  };
}

function normalizeAppearanceRow(
  row?: typeof companySettings.$inferSelect | null,
): ResolvedWorkspaceSettings {
  const appearance = {
    companyName: normalizeDisplayString(row?.companyName, DEFAULT_WORKSPACE_APPEARANCE.companyName),
    logoUrl: normalizeOptionalString(row?.logoUrl),
    logoUrlLightMode: normalizeOptionalString(row?.logoUrlLightMode),
    logoUrlDarkMode: normalizeOptionalString(row?.logoUrlDarkMode),
    faviconUrl: normalizeOptionalString(row?.faviconUrl),
    loginLogoUrl: normalizeOptionalString(row?.loginLogoUrl),
    loginLogoUrlLightMode: normalizeOptionalString(row?.loginLogoUrlLightMode),
    loginLogoUrlDarkMode: normalizeOptionalString(row?.loginLogoUrlDarkMode),
    primaryColor: normalizeHexColor(row?.primaryColor, DEFAULT_WORKSPACE_APPEARANCE.primaryColor),
    accentColor: normalizeHexColor(row?.accentColor, DEFAULT_WORKSPACE_APPEARANCE.accentColor),
    backgroundColor: normalizeHexColor(row?.backgroundColor, DEFAULT_WORKSPACE_APPEARANCE.backgroundColor),
    surfaceColor: normalizeHexColor(row?.surfaceColor, DEFAULT_WORKSPACE_APPEARANCE.surfaceColor),
    cardColor: normalizeHexColor(row?.cardColor, DEFAULT_WORKSPACE_APPEARANCE.cardColor),
    sidebarColor: normalizeHexColor(row?.sidebarColor, DEFAULT_WORKSPACE_APPEARANCE.sidebarColor),
    textColor: normalizeHexColor(row?.textColor, DEFAULT_WORKSPACE_APPEARANCE.textColor),
    borderColor: normalizeHexColor(row?.borderColor, DEFAULT_WORKSPACE_APPEARANCE.borderColor),
    borderRadius: clampNumber(row?.borderRadius ?? DEFAULT_WORKSPACE_APPEARANCE.borderRadius, 8, 40),
    fontScale: clampNumber(Number(row?.fontScale ?? DEFAULT_WORKSPACE_APPEARANCE.fontScale), 0.9, 1.15),
    fontPreset: FONT_PRESETS.includes((row?.fontPreset ?? "") as FontPreset)
      ? (row?.fontPreset as FontPreset)
      : DEFAULT_WORKSPACE_APPEARANCE.fontPreset,
    density: DENSITY_OPTIONS.includes((row?.density ?? "") as DensityOption)
      ? (row?.density as DensityOption)
      : DEFAULT_WORKSPACE_APPEARANCE.density,
    themeMode: THEME_MODES.includes((row?.themeMode ?? "") as ThemeMode)
      ? (row?.themeMode as ThemeMode)
      : DEFAULT_WORKSPACE_APPEARANCE.themeMode,
    designStyle: DESIGN_STYLES.includes((row?.designStyle ?? "") as DesignStyle)
      ? (row?.designStyle as DesignStyle)
      : DEFAULT_WORKSPACE_APPEARANCE.designStyle,
    glassEnabled: row?.glassEnabled ?? DEFAULT_WORKSPACE_APPEARANCE.glassEnabled,
    glassOpacity: clampNumber(row?.glassOpacity ?? DEFAULT_WORKSPACE_APPEARANCE.glassOpacity, 0, 100),
    glassBlur: clampNumber(row?.glassBlur ?? DEFAULT_WORKSPACE_APPEARANCE.glassBlur, 0, 30),
    celebrationsEnabled: row?.celebrationsEnabled ?? DEFAULT_WORKSPACE_APPEARANCE.celebrationsEnabled,
    stageCelebrationsEnabled:
      row?.stageCelebrationsEnabled ?? DEFAULT_WORKSPACE_APPEARANCE.stageCelebrationsEnabled,
    targetCelebrationsEnabled:
      row?.targetCelebrationsEnabled ?? DEFAULT_WORKSPACE_APPEARANCE.targetCelebrationsEnabled,
    loginBackgroundUrl: normalizeOptionalString(row?.loginBackgroundUrl),
    loginHeadline: normalizeDisplayString(row?.loginHeadline, DEFAULT_WORKSPACE_APPEARANCE.loginHeadline),
    loginSubheadline: normalizeDisplayString(
      row?.loginSubheadline,
      DEFAULT_WORKSPACE_APPEARANCE.loginSubheadline,
    ),
  } satisfies WorkspaceAppearanceSettings;

  const industryPreset = INDUSTRY_PRESETS.includes((row?.industryPreset ?? "") as IndustryPresetKey)
    ? (row?.industryPreset as IndustryPresetKey)
    : "general_business";

  return {
    id: row?.id ?? null,
    ...appearance,
    navigation: parseNavigationConfig(row?.navigationConfig),
    dashboard: parseDashboardConfig(row?.dashboardConfig),
    leadPreview: parseLeadPreviewConfig(row?.leadPreviewConfig),
    industryPreset,
  };
}

export function getResolvedThemeSettings(settings?: Partial<ResolvedWorkspaceSettings> | null) {
  const resolved = {
    ...DEFAULT_WORKSPACE_APPEARANCE,
    ...settings,
  };

  return {
    themeMode: THEME_MODES.includes(resolved.themeMode as ThemeMode)
      ? (resolved.themeMode as ThemeMode)
      : DEFAULT_WORKSPACE_APPEARANCE.themeMode,
    designStyle: DESIGN_STYLES.includes(resolved.designStyle as DesignStyle)
      ? (resolved.designStyle as DesignStyle)
      : DEFAULT_WORKSPACE_APPEARANCE.designStyle,
    density: DENSITY_OPTIONS.includes(resolved.density as DensityOption)
      ? (resolved.density as DensityOption)
      : DEFAULT_WORKSPACE_APPEARANCE.density,
    fontPreset: FONT_PRESETS.includes(resolved.fontPreset as FontPreset)
      ? (resolved.fontPreset as FontPreset)
      : DEFAULT_WORKSPACE_APPEARANCE.fontPreset,
    glassEnabled: Boolean(resolved.glassEnabled),
  };
}

const FONT_PRESET_VARIABLES: Record<
  FontPreset,
  { heading: string; body: string }
> = {
  brand: {
    heading: 'var(--font-heading-google), "Arial Narrow", "Roboto Condensed", sans-serif',
    body: 'var(--font-body-google), "Segoe UI", Arial, sans-serif',
  },
  system_sans: {
    heading:
      'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    body:
      'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  editorial: {
    heading:
      '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
    body:
      '"Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  compact: {
    heading:
      '"Bahnschrift SemiCondensed", "Arial Narrow", var(--font-heading-google), sans-serif',
    body:
      '"Aptos Narrow", "Segoe UI", Arial, sans-serif',
  },
};

export function getFontPresetVariables(fontPreset: FontPreset) {
  return FONT_PRESET_VARIABLES[fontPreset] ?? FONT_PRESET_VARIABLES.brand;
}

export function getDesignStyleClass(style: DesignStyle) {
  return `admin-style-${style}`;
}

export function getDensityClass(density: DensityOption) {
  return `admin-density-${density}`;
}

export function getSurfaceClass(style: DesignStyle) {
  return style === "liquid_glass" ? "admin-surface-glass" : "admin-surface";
}

export function getCardClass(style: DesignStyle) {
  return style === "classic" ? "admin-surface-muted" : "admin-surface";
}

export function getPanelClass(style: DesignStyle) {
  return style === "compact" ? "admin-surface-soft" : "admin-surface";
}

export function buildThemeCssVariables(settings: WorkspaceAppearanceSettings) {
  const fontVariables = getFontPresetVariables(settings.fontPreset);
  const backgroundImage = settings.loginBackgroundUrl?.trim()
    ? `url("${settings.loginBackgroundUrl.trim()}")`
    : 'url("/backgrounds/bg-butterfly-glass.png")';
  const glassOpacity = clampNumber(settings.glassOpacity, 0, 100) / 100;
  const glassBlur = `${clampNumber(settings.glassBlur, 0, 40)}px`;

  return {
    "--color-primary": settings.primaryColor,
    "--color-accent": settings.accentColor,
    "--color-background": settings.backgroundColor,
    "--color-surface": settings.surfaceColor,
    "--color-card": settings.cardColor,
    "--color-card-border": settings.borderColor,
    "--color-sidebar": settings.sidebarColor,
    "--color-text": settings.textColor,
    "--radius-ui": `${settings.borderRadius}px`,
    "--font-scale": String(settings.fontScale),
    "--ld-color-primary": settings.primaryColor,
    "--ld-color-primary-strong": settings.primaryColor,
    "--ld-color-accent": settings.accentColor,
    "--ld-color-background": settings.backgroundColor,
    "--ld-color-background-soft": settings.surfaceColor,
    "--ld-color-surface": `color-mix(in srgb, ${settings.surfaceColor} 70%, transparent)`,
    "--ld-color-surface-strong": `color-mix(in srgb, ${settings.surfaceColor} 84%, transparent)`,
    "--ld-color-card": `color-mix(in srgb, ${settings.cardColor} 62%, transparent)`,
    "--ld-color-card-strong": `color-mix(in srgb, ${settings.cardColor} 78%, transparent)`,
    "--ld-color-card-border": `color-mix(in srgb, ${settings.borderColor} 56%, rgba(255, 255, 255, 0.08))`,
    "--ld-color-sidebar": `color-mix(in srgb, ${settings.sidebarColor} 84%, transparent)`,
    "--ld-color-sidebar-active": `color-mix(in srgb, ${settings.primaryColor} 24%, rgba(255, 255, 255, 0.1))`,
    "--ld-color-text": settings.textColor,
    "--ld-color-muted": `color-mix(in srgb, ${settings.textColor} 58%, #9ca3af)`,
    "--ld-background-image": backgroundImage,
    "--ld-background-overlay-opacity": "0.48",
    "--ld-sidebar-width": "260px",
    "--ld-card-radius": `${settings.borderRadius}px`,
    "--ld-control-radius": `${Math.max(8, settings.borderRadius - 10)}px`,
    "--ld-font-scale": String(settings.fontScale),
    "--ld-glass-opacity": String(glassOpacity),
    "--ld-glass-blur": glassBlur,
    "--ld-glass-saturation": settings.designStyle === "liquid_glass" ? "1.35" : "1.12",
    "--font-heading": fontVariables.heading,
    "--font-body": fontVariables.body,
    "--font-heading-active": fontVariables.heading,
    "--font-body-active": fontVariables.body,
    "--density-scale": settings.density === "compact" ? "0.92" : "1",
    "--glass-opacity": String(glassOpacity),
    "--glass-blur": glassBlur,
  } as Record<string, string>;
}

export function resolveBrandLogo(options: {
  logoUrl?: string | null;
  logoUrlLightMode?: string | null;
  logoUrlDarkMode?: string | null;
  surfaceMode?: "light" | "dark";
}) {
  if (options.surfaceMode === "dark") {
    return options.logoUrlDarkMode ?? options.logoUrl ?? options.logoUrlLightMode ?? null;
  }

  return options.logoUrlLightMode ?? options.logoUrl ?? options.logoUrlDarkMode ?? null;
}

export function resolveNavigationConfig(raw?: Partial<NavigationCustomizationConfig> | null) {
  return parseNavigationConfig(raw ?? DEFAULT_NAVIGATION_CONFIG);
}

export function resolveNavigationItems<T extends { key: NavigationItemKey; label: string }>(
  items: T[],
  config: NavigationCustomizationConfig,
) {
  const preferenceMap = new Map(config.items.map((item) => [item.key, item]));

  return items
    .map((item, index) => {
      const preference = preferenceMap.get(item.key);
      const forcedVisible = requiredNavigationKeys.has(item.key);
      return {
        ...item,
        label: normalizeOptionalString(preference?.label) ?? item.label,
        visible: forcedVisible ? true : preference?.visible !== false,
        order: preference?.order ?? index,
      };
    })
    .filter((item) => item.visible)
    .sort((left, right) => left.order - right.order);
}

export function resolveDashboardConfig(raw?: Partial<DashboardCustomizationConfig> | null) {
  return parseDashboardConfig(raw ?? DEFAULT_DASHBOARD_CONFIG);
}

export function resolveDashboardWidgetOrder<T extends { id: DashboardWidgetKey }>(
  widgets: T[],
  config: DashboardCustomizationConfig,
) {
  const hidden = new Set(config.hiddenWidgets);
  const orderMap = new Map(config.widgetOrder.map((key, index) => [key, index]));

  return widgets
    .filter((widget) => !hidden.has(widget.id))
    .sort((left, right) => (orderMap.get(left.id) ?? 999) - (orderMap.get(right.id) ?? 999));
}

export function resolveLeadPreviewConfig(
  raw?: Partial<LeadPreviewCustomizationConfig> | null,
  customFields: Array<Pick<CustomFieldDefinition, "id" | "archived" | "showInTable">> = [],
) {
  const parsed = parseLeadPreviewConfig(raw ?? DEFAULT_LEAD_PREVIEW_CONFIG);
  const allowedCustomKeys = new Set(
    customFields.filter((field) => !field.archived && field.showInTable).map((field) => `custom:${field.id}`),
  );

  function keepAllowed(values: LeadPreviewFieldKey[]) {
    return values.filter((value, index, list) => {
      if (list.indexOf(value) !== index) {
        return false;
      }

      if (value.startsWith("custom:")) {
        return allowedCustomKeys.has(value);
      }

      return CORE_LEAD_PREVIEW_FIELDS.includes(value as CoreLeadPreviewField);
    });
  }

  return {
    desktopColumns: keepAllowed(parsed.desktopColumns),
    mobileFields: keepAllowed(parsed.mobileFields),
    maxCustomFieldColumns: clampNumber(parsed.maxCustomFieldColumns, 1, 8),
  };
}

export function resolveVisibleLeadPreviewFields(
  config: LeadPreviewCustomizationConfig,
  customFields: Array<Pick<CustomFieldDefinition, "id" | "archived" | "showInTable">> = [],
) {
  return resolveLeadPreviewConfig(config, customFields);
}

export function getVerticalPreset(key: IndustryPresetKey) {
  return VERTICAL_PRESET_DEFINITIONS[key];
}

export function buildVerticalPresetSettingsPatch(key: IndustryPresetKey) {
  const preset = getVerticalPreset(key);
  return {
    industryPreset: key,
    dashboardConfig: {
      ...DEFAULT_DASHBOARD_CONFIG,
      widgetOrder: preset.dashboardWidgets,
      hiddenWidgets: DASHBOARD_WIDGET_KEYS.filter((widget) => !preset.dashboardWidgets.includes(widget)),
    },
    leadPreviewConfig: {
      desktopColumns: preset.leadPreviewDefaults,
      mobileFields: preset.mobilePreviewDefaults,
      maxCustomFieldColumns: DEFAULT_LEAD_PREVIEW_CONFIG.maxCustomFieldColumns,
    },
  };
}

export async function getCompanySettings() {
  try {
    const db = getDb();
    const [row] = await db.select().from(companySettings).orderBy(asc(companySettings.createdAt)).limit(1);
    return normalizeAppearanceRow(row);
  } catch {
    return normalizeAppearanceRow(null);
  }
}

async function ensureCompanySettingsRow() {
  const db = getDb();
  const [existing] = await db.select().from(companySettings).orderBy(asc(companySettings.createdAt)).limit(1);
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
      ...(patch.loginBackgroundUrl !== undefined ? { loginBackgroundUrl: patch.loginBackgroundUrl } : {}),
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

    await createLeadSource({
      name: sourceName,
    });
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
