"use client";

import type { CSSProperties } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, ImagePlus, Monitor, RotateCcw, Sparkles, X } from "lucide-react";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { cn } from "@/lib/cn";
import { generateColorHarmony } from "@/lib/design-system";
import {
  buildThemeCssVariables,
  DEFAULT_WORKSPACE_APPEARANCE,
  FONT_PRESETS,
  resolveBrandLogo,
  type ResolvedWorkspaceSettings,
} from "@/lib/crm/workspace-settings";
import { AnimatedCard, SectionHeader, SmoothButton, StatusRing } from "@/components/admin/ui";

type AppearanceDraft = Pick<
  ResolvedWorkspaceSettings,
  | "companyName"
  | "logoUrl"
  | "logoUrlLightMode"
  | "logoUrlDarkMode"
  | "faviconUrl"
  | "loginLogoUrl"
  | "loginLogoUrlLightMode"
  | "loginLogoUrlDarkMode"
  | "primaryColor"
  | "accentColor"
  | "backgroundColor"
  | "surfaceColor"
  | "cardColor"
  | "sidebarColor"
  | "textColor"
  | "borderColor"
  | "borderRadius"
  | "fontScale"
  | "fontPreset"
  | "density"
  | "themeMode"
  | "designStyle"
  | "glassEnabled"
  | "glassOpacity"
  | "glassBlur"
  | "celebrationsEnabled"
  | "stageCelebrationsEnabled"
  | "targetCelebrationsEnabled"
  | "loginBackgroundUrl"
  | "loginHeadline"
  | "loginSubheadline"
>;

const BACKGROUND_PRESETS = [
  { label: "Dark Luxury", value: "/backgrounds/bg-dark-luxury.png" },
  { label: "Butterfly Glass", value: "/backgrounds/bg-butterfly-glass.png" },
  { label: "Botanical Bloom", value: "/backgrounds/bg-botanical-bloom.png" },
  { label: "Cyberpunk Minimal", value: "/backgrounds/bg-cyberpunk-minimal.png" },
  { label: "Midnight Horizon", value: "/backgrounds/bg-midnight-horizon.png" },
] as const;

const DEFAULT_BACKGROUND = BACKGROUND_PRESETS[0].value;
const MAX_THEME_IMAGE_BYTES = 2 * 1024 * 1024;
const QUICK_COLOR_SWATCHES = [
  "#0f172a",
  "#1d4ed8",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#111827",
  "#f59e0b",
] as const;

const COLOR_PRESETS = [
  {
    name: "Ocean",
    primaryColor: "#0ea5e9",
    accentColor: "#06b6d4",
    backgroundColor: "#0a1628",
    surfaceColor: "#0f1f38",
    cardColor: "#0d2238",
    sidebarColor: "#071528",
    textColor: "#f0f9ff",
    borderColor: "#1e3a5f",
  },
  {
    name: "Sunset",
    primaryColor: "#f97316",
    accentColor: "#f43f5e",
    backgroundColor: "#1a0a0f",
    surfaceColor: "#2a1018",
    cardColor: "#221018",
    sidebarColor: "#14080c",
    textColor: "#fff1f2",
    borderColor: "#4a1a24",
  },
  {
    name: "Forest",
    primaryColor: "#10b981",
    accentColor: "#84cc16",
    backgroundColor: "#0a1a0f",
    surfaceColor: "#0f2418",
    cardColor: "#0d2218",
    sidebarColor: "#07140c",
    textColor: "#f0fdf4",
    borderColor: "#1e4a2f",
  },
  {
    name: "Midnight",
    primaryColor: "#6366f1",
    accentColor: "#a855f7",
    backgroundColor: "#0a0a14",
    surfaceColor: "#121224",
    cardColor: "#111830",
    sidebarColor: "#080b18",
    textColor: "#faf5ff",
    borderColor: "#2e2a5f",
  },
  {
    name: "Rose",
    primaryColor: "#e11d48",
    accentColor: "#fb7185",
    backgroundColor: "#1a0a10",
    surfaceColor: "#2a1018",
    cardColor: "#221018",
    sidebarColor: "#14080c",
    textColor: "#fff1f2",
    borderColor: "#4a1a2f",
  },
] as const;

function toOptionalString(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function getGlassStyle(draft: AppearanceDraft): "off" | "soft" | "vibrant" | "bold" {
  if (!draft.glassEnabled) {
    return "off";
  }

  if (draft.glassOpacity >= 78 || draft.glassBlur >= 28) {
    return "bold";
  }

  if (draft.glassOpacity >= 62 || draft.glassBlur >= 22) {
    return "vibrant";
  }

  return "soft";
}

function applyGlassStyle(style: "off" | "soft" | "vibrant" | "bold") {
  if (style === "off") {
    return { glassEnabled: false, designStyle: "modern" as const };
  }

  const values = {
    soft: { glassOpacity: 34, glassBlur: 14 },
    vibrant: { glassOpacity: 70, glassBlur: 24 },
    bold: { glassOpacity: 82, glassBlur: 30 },
  }[style];

  return {
    ...values,
    glassEnabled: true,
    designStyle: "liquid_glass" as const,
  };
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{children}</span>;
}

function TextControl({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "url";
}) {
  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="admin-input h-11 w-full px-4 text-sm outline-none"
      />
    </label>
  );
}

function ImageUploadControl({
  label,
  value,
  onChange,
  description,
  compact = false,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  description?: string;
  compact?: boolean;
}) {
  const [error, setError] = useState("");

  function handleFile(file?: File | null) {
    setError("");
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, WebP, SVG, or GIF image.");
      return;
    }

    if (file.size > MAX_THEME_IMAGE_BYTES) {
      setError("Keep images under 2MB for a fast workspace.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className={cn("flex gap-3", compact ? "items-center" : "items-stretch")}>
          <div
            className={cn(
              "grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06]",
              compact ? "h-14 w-14" : "h-20 w-28",
            )}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5 text-white/70" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{value ? "Image selected" : "Upload image"}</p>
            <p className="mt-1 text-xs leading-5 text-white/70">
              {description ?? "PNG, JPG, WebP, SVG, or GIF. Max 2MB."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="admin-button-secondary inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold">
                Choose file
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                  className="sr-only"
                />
              </label>
              {value ? (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-white/70 transition hover:border-rose-300/35 hover:bg-rose-400/12 hover:text-rose-100"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-200">{error}</p> : null}
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const harmonySwatches = useMemo(() => {
    try {
      return generateColorHarmony(value, "analogous").slice(0, 5);
    } catch {
      return [];
    }
  }, [value]);

  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="group rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_34px_rgba(0,0,0,0.18)] transition focus-within:border-[color:var(--ld-color-accent)]/55 focus-within:bg-white/[0.08]">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-12 w-14 cursor-pointer overflow-hidden rounded-[18px] border border-white/12 bg-transparent p-0 shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
            aria-label={label}
          />
          <StatusRing progress={100} size={28} color={value} strokeWidth={4} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
            <input
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="mt-1 min-w-0 w-full bg-transparent text-base font-semibold tracking-[-0.02em] text-white outline-none"
              aria-label={`${label} hex value`}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_COLOR_SWATCHES.map((swatch) => {
            const isActive = value.toLowerCase() === swatch.toLowerCase();
            return (
              <button
                key={swatch}
                type="button"
                onClick={() => onChange(swatch)}
                className={cn(
                  "h-8 w-8 rounded-full border transition",
                  isActive
                    ? "scale-105 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.12)]"
                    : "border-white/12 hover:border-white/40",
                )}
                style={{ background: swatch }}
                aria-label={`${label} swatch ${swatch}`}
              />
            );
          })}
        </div>
        {harmonySwatches.length > 0 ? (
          <div className="mt-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Harmony</p>
            <div className="flex flex-wrap gap-2">
              {harmonySwatches.map((swatch) => {
                const isActive = value.toLowerCase() === swatch.toLowerCase();
                return (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => onChange(swatch)}
                    className={cn(
                      "h-6 w-6 rounded-full border transition",
                      isActive
                        ? "scale-105 border-white shadow-[0_0_0_2px_rgba(255,255,255,0.12)]"
                        : "border-white/10 hover:border-white/30",
                    )}
                    style={{ background: swatch }}
                    aria-label={`${label} harmony swatch ${swatch}`}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function RangeControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  display,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  display?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs font-semibold text-white/70">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="admin-range w-full"
        style={{
          background: `linear-gradient(90deg, var(--ld-color-primary) 0%, var(--ld-color-accent) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </label>
  );
}

function ThemeSection({
  title,
  description,
  children,
  delay = 0,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <AnimatedCard variant="default" animation="fadeInUp" delay={delay} className="p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.04em] text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-white/70">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </AnimatedCard>
  );
}

function MiniPreview({
  draft,
  previewStyle,
}: {
  draft: AppearanceDraft;
  previewStyle: CSSProperties;
}) {
  const background = draft.loginBackgroundUrl || DEFAULT_BACKGROUND;
  const glassStyle = getGlassStyle(draft);

  return (
    <div
      className="admin-shell relative min-h-[640px] overflow-hidden rounded-[32px] border border-white/10 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
      style={previewStyle}
      data-design-style={draft.designStyle}
      data-density={draft.density}
      data-theme-mode={draft.themeMode}
      data-glass={draft.glassEnabled ? "on" : "off"}
      data-glass-style={glassStyle}
    >
      <div className="ld-bg-overlay" aria-hidden="true" />
      <div className="relative z-10 grid h-full gap-4 lg:grid-cols-[150px_minmax(0,1fr)]">
        <aside className="ld-glass-sidebar rounded-[24px] border border-white/10 p-3">
          <LeadsDeskWordmark
            tone="light"
            companyName={draft.companyName}
            logoUrl={resolveBrandLogo({
              logoUrl: draft.logoUrl,
              logoUrlLightMode: draft.logoUrlLightMode,
              logoUrlDarkMode: draft.logoUrlDarkMode,
              surfaceMode: "dark",
            })}
            logoUrlLightMode={draft.logoUrlLightMode}
            logoUrlDarkMode={draft.logoUrlDarkMode}
            surfaceMode="dark"
          />
          <div className="mt-5 space-y-2">
            {["Dashboard", "Leads", "Reports", "Settings"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "h-9 rounded-2xl border px-3 py-2 text-xs font-semibold",
                  index === 0
                    ? "border-white/12 bg-[color:var(--ld-color-sidebar-active)] text-white"
                    : "border-white/8 bg-white/[0.035] text-white/70",
                )}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="ld-glass-topbar rounded-[24px] border border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Live preview</p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.05em] text-white">Sales command center</h3>
              </div>
              <button className="admin-button-primary h-10 rounded-2xl px-4 text-sm">Add lead</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Total Leads", "1,256"],
              ["Overdue", "12"],
              ["Won Value", "$84k"],
            ].map(([label, value]) => (
              <div key={label} className="ld-glass ld-glass-card ld-glass-soft p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
                <p className="mt-4 text-2xl font-semibold tracking-[-0.06em] text-white">{value}</p>
                <div className="mt-4 h-1.5 rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,var(--ld-color-primary),var(--ld-color-accent))]" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="ld-glass ld-glass-card ld-glass-soft p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Recent leads</p>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/70">
                  This week
                </span>
              </div>
              <div className="ld-readable-table">
                {["Amina Bello", "Jordan Lee", "Maya Stone"].map((lead, index) => (
                  <div
                    key={lead}
                    className="grid grid-cols-[1fr_80px_72px] gap-3 border-b border-white/5 px-3 py-3 text-sm last:border-b-0"
                  >
                    <span className="font-medium text-white">{lead}</span>
                    <span className="text-white/70">{index === 0 ? "Website" : "Referral"}</span>
                    <span className="text-[color:var(--ld-color-accent)]">{index === 0 ? "New" : "Won"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="ld-glass ld-glass-card ld-glass-vibrant p-5"
              style={{
                backgroundImage: `linear-gradient(180deg, color-mix(in srgb, var(--ld-color-background, ${draft.backgroundColor}) 42%, transparent), color-mix(in srgb, var(--ld-color-background, ${draft.backgroundColor}) 66%, transparent)), url(${background})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            >
              <LeadsDeskWordmark
                tone="light"
                companyName={draft.companyName}
                logoUrl={resolveBrandLogo({
                  logoUrl: draft.loginLogoUrl || draft.logoUrl,
                  logoUrlLightMode: draft.loginLogoUrlLightMode || draft.logoUrlLightMode,
                  logoUrlDarkMode: draft.loginLogoUrlDarkMode || draft.logoUrlDarkMode,
                  surfaceMode: "dark",
                })}
                logoUrlLightMode={draft.loginLogoUrlLightMode || draft.logoUrlLightMode}
                logoUrlDarkMode={draft.loginLogoUrlDarkMode || draft.logoUrlDarkMode}
                surfaceMode="dark"
              />
              <h4 className="mt-10 text-2xl font-semibold tracking-[-0.05em] text-white">{draft.loginHeadline}</h4>
              <p className="mt-2 text-sm leading-6 text-white/70">{draft.loginSubheadline}</p>
              <div className="mt-5 space-y-2">
                <div className="h-10 rounded-2xl border border-white/10 bg-white/[0.08]" />
                <div className="h-10 rounded-2xl border border-white/10 bg-white/[0.08]" />
                <button className="admin-button-primary h-10 w-full rounded-2xl text-sm">Sign in</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettingsManager({
  initialSettings,
}: {
  initialSettings: ResolvedWorkspaceSettings;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<AppearanceDraft>({
    companyName: initialSettings.companyName,
    logoUrl: initialSettings.logoUrl,
    logoUrlLightMode: initialSettings.logoUrlLightMode,
    logoUrlDarkMode: initialSettings.logoUrlDarkMode,
    faviconUrl: initialSettings.faviconUrl,
    loginLogoUrl: initialSettings.loginLogoUrl,
    loginLogoUrlLightMode: initialSettings.loginLogoUrlLightMode,
    loginLogoUrlDarkMode: initialSettings.loginLogoUrlDarkMode,
    primaryColor: initialSettings.primaryColor,
    accentColor: initialSettings.accentColor,
    backgroundColor: initialSettings.backgroundColor,
    surfaceColor: initialSettings.surfaceColor,
    cardColor: initialSettings.cardColor,
    sidebarColor: initialSettings.sidebarColor,
    textColor: initialSettings.textColor,
    borderColor: initialSettings.borderColor,
    borderRadius: initialSettings.borderRadius,
    fontScale: initialSettings.fontScale,
    fontPreset: initialSettings.fontPreset,
    density: initialSettings.density,
    themeMode: initialSettings.themeMode,
    designStyle: initialSettings.designStyle,
    glassEnabled: initialSettings.glassEnabled,
    glassOpacity: initialSettings.glassOpacity,
    glassBlur: initialSettings.glassBlur,
    celebrationsEnabled: initialSettings.celebrationsEnabled,
    stageCelebrationsEnabled: initialSettings.stageCelebrationsEnabled,
    targetCelebrationsEnabled: initialSettings.targetCelebrationsEnabled,
    loginBackgroundUrl: initialSettings.loginBackgroundUrl || DEFAULT_BACKGROUND,
    loginHeadline: initialSettings.loginHeadline,
    loginSubheadline: initialSettings.loginSubheadline,
  });
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const previewStyle = useMemo(
    () =>
      buildThemeCssVariables({
        ...initialSettings,
        ...draft,
      }) as CSSProperties,
    [draft, initialSettings],
  );

  useEffect(() => {
    const root = document.documentElement;
    const previous = new Map<string, string>();

    for (const [key, value] of Object.entries(previewStyle)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, String(value));
    }

    return () => {
      for (const [key, value] of previous.entries()) {
        if (value) {
          root.style.setProperty(key, value);
        } else {
          root.style.removeProperty(key);
        }
      }
    };
  }, [previewStyle]);

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          logoUrl: toOptionalString(draft.logoUrl),
          logoUrlLightMode: toOptionalString(draft.logoUrlLightMode),
          logoUrlDarkMode: toOptionalString(draft.logoUrlDarkMode),
          faviconUrl: toOptionalString(draft.faviconUrl),
          loginLogoUrl: toOptionalString(draft.loginLogoUrl),
          loginLogoUrlLightMode: toOptionalString(draft.loginLogoUrlLightMode),
          loginLogoUrlDarkMode: toOptionalString(draft.loginLogoUrlDarkMode),
          loginBackgroundUrl: toOptionalString(draft.loginBackgroundUrl),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save appearance settings right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Theme saved.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save appearance settings right now.");
      setIsSaving(false);
    }
  }

  function update<K extends keyof AppearanceDraft>(key: K, value: AppearanceDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateMany(values: Partial<AppearanceDraft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  function resetToDefaults() {
    setDraft({ ...DEFAULT_WORKSPACE_APPEARANCE, loginBackgroundUrl: DEFAULT_BACKGROUND });
  }

  const selectedBackground = draft.loginBackgroundUrl || DEFAULT_BACKGROUND;
  const glassStyle = getGlassStyle(draft);

  return (
    <>
    <div className="space-y-5">
        <AnimatedCard variant="elevated" animation="none" className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Theme Studio"
            title="Make it yours"
            description="Brand the workspace, login screen, colors, glass, and layout."
            actions={
              <div className="flex flex-wrap gap-3">
                <SmoothButton
                  variant="secondary"
                  size="md"
                  icon={<Eye className="h-4 w-4" />}
                  onClick={() => setIsPreviewOpen(true)}
                >
                  Open preview
                </SmoothButton>
                <SmoothButton
                  variant="primary"
                  size="md"
                  loading={isSaving}
                  onClick={() => void saveSettings()}
                >
                  {isSaving ? "Saving..." : "Save theme"}
                </SmoothButton>
                <SmoothButton
                  variant="ghost"
                  size="md"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={resetToDefaults}
                >
                  Reset to defaults
                </SmoothButton>
              </div>
            }
            variant="large"
          />
          {message ? <p className="mt-4 text-sm text-white/70">{message}</p> : null}
        </AnimatedCard>

        <ThemeSection title="Brand" description="Set the names and logos clients see." delay={0}>
          <TextControl label="Company name" value={draft.companyName} onChange={(value) => update("companyName", value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploadControl
              label="Default logo"
              value={draft.logoUrl}
              onChange={(value) => update("logoUrl", value)}
              description="Used when no light or dark logo is set."
            />
            <ImageUploadControl
              label="Favicon"
              value={draft.faviconUrl ?? ""}
              onChange={(value) => update("faviconUrl", value)}
              compact
            />
            <ImageUploadControl
              label="Light mode logo"
              value={draft.logoUrlLightMode ?? ""}
              onChange={(value) => update("logoUrlLightMode", value)}
              description="Optimized for bright surfaces."
            />
            <ImageUploadControl
              label="Dark mode logo"
              value={draft.logoUrlDarkMode ?? ""}
              onChange={(value) => update("logoUrlDarkMode", value)}
              description="Optimized for dark glass."
            />
          </div>
        </ThemeSection>

        <ThemeSection title="Quick Presets" description="One-click harmonious color combinations." delay={80}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => updateMany(preset)}
                className="group rounded-[20px] border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="flex h-7 overflow-hidden rounded-lg border border-white/10">
                  <div className="flex-1" style={{ background: preset.primaryColor }} />
                  <div className="flex-1" style={{ background: preset.accentColor }} />
                  <div className="flex-1" style={{ background: preset.backgroundColor }} />
                  <div className="flex-1" style={{ background: preset.surfaceColor }} />
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{preset.name}</p>
              </button>
            ))}
          </div>
        </ThemeSection>

        <ThemeSection title="Colors" description="Tune the workspace without touching CSS." delay={160}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorControl label="Primary" value={draft.primaryColor} onChange={(value) => update("primaryColor", value)} />
            <ColorControl label="Accent" value={draft.accentColor} onChange={(value) => update("accentColor", value)} />
            <ColorControl label="Sidebar" value={draft.sidebarColor} onChange={(value) => update("sidebarColor", value)} />
            <ColorControl label="Surface" value={draft.surfaceColor} onChange={(value) => update("surfaceColor", value)} />
            <ColorControl label="Card" value={draft.cardColor} onChange={(value) => update("cardColor", value)} />
            <ColorControl label="Text" value={draft.textColor} onChange={(value) => update("textColor", value)} />
          </div>
        </ThemeSection>

        <ThemeSection title="Background" description="Choose the atmosphere for the workspace." delay={240}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {BACKGROUND_PRESETS.map((preset) => {
              const isSelected = selectedBackground === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    update("loginBackgroundUrl", preset.value);
                  }}
                  className={cn(
                    "group relative h-24 overflow-hidden rounded-2xl border text-left shadow-[0_14px_30px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5",
                    isSelected ? "border-[color:var(--ld-color-accent)]" : "border-white/10",
                  )}
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.52)), url(${preset.value})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                >
                  <span className="absolute inset-x-2 bottom-2 text-[11px] font-semibold leading-tight text-white drop-shadow">
                    {preset.label}
                  </span>
                  {isSelected ? (
                    <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ld-color-accent)] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <ImageUploadControl
            label="Upload background"
            value={
              draft.loginBackgroundUrl && !BACKGROUND_PRESETS.some((preset) => preset.value === draft.loginBackgroundUrl)
                ? draft.loginBackgroundUrl
                : null
            }
            onChange={(value) => update("loginBackgroundUrl", value || DEFAULT_BACKGROUND)}
            description="Optional client-owned background. Presets stay faster for most teams."
          />
        </ThemeSection>

        <ThemeSection title="Glass" description="Control depth, blur, and shine." delay={320}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["off", "soft", "vibrant", "bold"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => updateMany(applyGlassStyle(style))}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition",
                  glassStyle === style
                    ? "border-[color:var(--ld-color-accent)] bg-[color:var(--ld-color-accent)]/18 text-white"
                    : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/[0.08]",
                )}
              >
                {style.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <RangeControl
              label="Opacity"
              value={draft.glassOpacity}
              min={0}
              max={100}
              display={`${Math.round(draft.glassOpacity)}%`}
              onChange={(value) => update("glassOpacity", value)}
            />
            <RangeControl
              label="Blur"
              value={draft.glassBlur}
              min={0}
              max={40}
              display={`${draft.glassBlur}px`}
              onChange={(value) => update("glassBlur", value)}
            />
          </div>
        </ThemeSection>

        <ThemeSection title="Layout" description="Adjust density, type, and rhythm." delay={400}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <FieldLabel>Density</FieldLabel>
              <select
                value={draft.density}
                onChange={(event) => update("density", event.target.value as AppearanceDraft["density"])}
                className="admin-select h-11 w-full px-4 text-sm outline-none"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            <label className="space-y-2">
              <FieldLabel>Font style</FieldLabel>
              <select
                value={draft.fontPreset}
                onChange={(event) => update("fontPreset", event.target.value as AppearanceDraft["fontPreset"])}
                className="admin-select h-11 w-full px-4 text-sm outline-none"
              >
                {FONT_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset === "brand"
                      ? "Brand default"
                      : preset === "system_sans"
                        ? "System sans"
                        : preset === "editorial"
                          ? "Editorial"
                          : "Compact"}
                  </option>
                ))}
              </select>
            </label>
            <RangeControl
              label="Font scale"
              value={draft.fontScale}
              min={0.8}
              max={1.3}
              step={0.01}
              display={`${draft.fontScale.toFixed(2)}x`}
              onChange={(value) => update("fontScale", value)}
            />
            <RangeControl
              label="Corners"
              value={draft.borderRadius}
              min={8}
              max={40}
              display={`${draft.borderRadius}px`}
              onChange={(value) => update("borderRadius", value)}
            />
          </div>
        </ThemeSection>

        <ThemeSection title="Login page" description="Make the first screen feel owned." delay={480}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploadControl
              label="Login logo"
              value={draft.loginLogoUrl ?? ""}
              onChange={(value) => update("loginLogoUrl", value)}
            />
            <TextControl
              label="Headline"
              value={draft.loginHeadline}
              onChange={(value) => update("loginHeadline", value)}
            />
            <TextControl
              label="Subheadline"
              value={draft.loginSubheadline}
              onChange={(value) => update("loginSubheadline", value)}
            />
          </div>
        </ThemeSection>

        <ThemeSection title="Celebrations" description="Add soul without overwhelming the team." delay={560}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["celebrationsEnabled", "All celebrations"],
              ["stageCelebrationsEnabled", "Stage milestones"],
              ["targetCelebrationsEnabled", "Goal wins"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/72"
              >
                <input
                  type="checkbox"
                  checked={Boolean(draft[key as keyof AppearanceDraft])}
                  onChange={(event) => update(key as keyof AppearanceDraft, event.target.checked as never)}
                  className="admin-toggle"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </ThemeSection>
        <AnimatedCard variant="default" animation="fadeInUp" delay={640} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
                Preview
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Preview before you save</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Open the live workspace mockup in a focused view instead of squeezing it beside the controls.</p>
            </div>
            <SmoothButton
              variant="secondary"
              size="md"
              icon={<Monitor className="h-4 w-4" />}
              onClick={() => setIsPreviewOpen(true)}
            >
              Open live preview
            </SmoothButton>
          </div>
        </AnimatedCard>
      </div>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#030712]/78 p-4 backdrop-blur-xl">
          <div className="relative w-full max-w-[1240px] rounded-[34px] border border-white/10 bg-[#040918]/92 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 pt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
                  Live preview
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">Workspace snapshot</h2>
              </div>
              <SmoothButton
                variant="secondary"
                size="md"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close preview
              </SmoothButton>
            </div>
            <MiniPreview draft={draft} previewStyle={previewStyle} />
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/70">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ld-color-accent)]" />
              Theme changes update this page instantly and save to company settings.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
