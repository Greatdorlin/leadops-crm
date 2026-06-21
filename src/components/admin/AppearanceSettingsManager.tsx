"use client";

import type { CSSProperties } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, Sparkles } from "lucide-react";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import { cn } from "@/lib/cn";
import {
  buildThemeCssVariables,
  FONT_PRESETS,
  resolveBrandLogo,
  type ResolvedWorkspaceSettings,
} from "@/lib/crm/workspace-settings";
import { GlassCard } from "./GlassCard";

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
  return <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">{children}</span>;
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

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-[var(--ld-control-radius)] border border-white/10 bg-white/[0.045] p-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-xl border border-white/12 bg-transparent"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-white outline-none"
          aria-label={`${label} hex value`}
        />
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
        <span className="text-xs font-semibold text-white/58">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[color:var(--ld-color-accent)]"
      />
    </label>
  );
}

function ThemeSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.04em] text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-white/56">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </GlassCard>
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
                    : "border-white/8 bg-white/[0.035] text-white/58",
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Live preview</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/48">{label}</p>
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
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/58">
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
                    <span className="text-white/58">{index === 0 ? "Website" : "Referral"}</span>
                    <span className="text-[color:var(--ld-color-accent)]">{index === 0 ? "New" : "Won"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="ld-glass ld-glass-card ld-glass-vibrant p-5"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(8,12,24,0.42), rgba(8,12,24,0.66)), url(${background})`,
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
              <p className="mt-2 text-sm leading-6 text-white/66">{draft.loginSubheadline}</p>
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
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(draft.loginBackgroundUrl ?? "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const selectedBackground = draft.loginBackgroundUrl || DEFAULT_BACKGROUND;
  const glassStyle = getGlassStyle(draft);

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
      <div className="space-y-5">
        <GlassCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
                Theme Studio
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-white">Make it yours</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Brand the workspace, login screen, colors, glass, and layout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={isSaving}
              className="admin-button-primary h-11 rounded-2xl px-5 text-sm"
            >
              {isSaving ? "Saving..." : "Save theme"}
            </button>
          </div>
          {message ? <p className="mt-4 text-sm text-white/64">{message}</p> : null}
        </GlassCard>

        <ThemeSection title="Brand" description="Set the names and logos clients see.">
          <TextControl label="Company name" value={draft.companyName} onChange={(value) => update("companyName", value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextControl label="Logo URL" value={draft.logoUrl ?? ""} onChange={(value) => update("logoUrl", value)} type="url" />
            <TextControl
              label="Favicon URL"
              value={draft.faviconUrl ?? ""}
              onChange={(value) => update("faviconUrl", value)}
              type="url"
            />
            <TextControl
              label="Logo for light mode"
              value={draft.logoUrlLightMode ?? ""}
              onChange={(value) => update("logoUrlLightMode", value)}
              type="url"
            />
            <TextControl
              label="Logo for dark mode"
              value={draft.logoUrlDarkMode ?? ""}
              onChange={(value) => update("logoUrlDarkMode", value)}
              type="url"
            />
          </div>
        </ThemeSection>

        <ThemeSection title="Colors" description="Tune the workspace without touching CSS.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorControl label="Primary" value={draft.primaryColor} onChange={(value) => update("primaryColor", value)} />
            <ColorControl label="Accent" value={draft.accentColor} onChange={(value) => update("accentColor", value)} />
            <ColorControl label="Sidebar" value={draft.sidebarColor} onChange={(value) => update("sidebarColor", value)} />
            <ColorControl label="Surface" value={draft.surfaceColor} onChange={(value) => update("surfaceColor", value)} />
            <ColorControl label="Card" value={draft.cardColor} onChange={(value) => update("cardColor", value)} />
            <ColorControl label="Text" value={draft.textColor} onChange={(value) => update("textColor", value)} />
          </div>
        </ThemeSection>

        <ThemeSection title="Background" description="Choose the atmosphere for the workspace.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {BACKGROUND_PRESETS.map((preset) => {
              const isSelected = selectedBackground === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    update("loginBackgroundUrl", preset.value);
                    setCustomBackgroundUrl(preset.value);
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
          <TextControl
            label="Custom background URL"
            value={customBackgroundUrl}
            onChange={(value) => {
              setCustomBackgroundUrl(value);
              update("loginBackgroundUrl", value);
            }}
            type="url"
            placeholder="/backgrounds/bg-dark-luxury.png"
          />
          <RangeControl
            label="Overlay opacity"
            value={62}
            min={0}
            max={100}
            display="62%"
            onChange={() => undefined}
          />
        </ThemeSection>

        <ThemeSection title="Glass" description="Control depth, blur, and shine.">
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
                    : "border-white/10 bg-white/[0.045] text-white/62 hover:bg-white/[0.08]",
                )}
              >
                {style.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
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
            <RangeControl
              label="Saturation"
              value={draft.designStyle === "liquid_glass" ? 150 : 112}
              min={0}
              max={300}
              display={draft.designStyle === "liquid_glass" ? "1.5" : "1.12"}
              onChange={() => update("designStyle", "liquid_glass")}
            />
          </div>
        </ThemeSection>

        <ThemeSection title="Layout" description="Adjust density, type, and rhythm.">
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

        <ThemeSection title="Login page" description="Make the first screen feel owned.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextControl
              label="Login logo URL"
              value={draft.loginLogoUrl ?? ""}
              onChange={(value) => update("loginLogoUrl", value)}
              type="url"
            />
            <TextControl
              label="Login background URL"
              value={draft.loginBackgroundUrl ?? ""}
              onChange={(value) => {
                update("loginBackgroundUrl", value);
                setCustomBackgroundUrl(value);
              }}
              type="url"
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

        <ThemeSection title="Celebrations" description="Add soul without overwhelming the team.">
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
                  className="h-4 w-4 accent-[color:var(--ld-color-accent)]"
                />
                {label}
              </label>
            ))}
          </div>
        </ThemeSection>
      </div>

      <aside className="2xl:sticky 2xl:top-5 2xl:self-start">
        <GlassCard glassStyle="vibrant" className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
                Preview
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Live workspace</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/62">
              <Monitor className="h-3.5 w-3.5" />
              Live
            </span>
          </div>
          <MiniPreview draft={draft} previewStyle={previewStyle} />
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/62">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ld-color-accent)]" />
            Theme changes update this page instantly and save to company settings.
          </div>
        </GlassCard>
      </aside>
    </div>
  );
}
