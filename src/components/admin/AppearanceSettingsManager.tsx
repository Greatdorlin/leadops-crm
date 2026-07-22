"use client";

import type { CSSProperties } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ImagePlus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { generateColorHarmony } from "@/lib/design-system";
import { appRoutes } from "@/lib/app-routes";
import {
  buildThemeCssVariables,
  DEFAULT_WORKSPACE_APPEARANCE,
  CELEBRATION_STYLES,
  FONT_PRESETS,
  getWorkspaceAppearanceContrastIssues,
  type ResolvedWorkspaceSettings,
} from "@/lib/crm/workspace-settings";
import { AnimatedCard, SectionHeader, SmoothButton, StatusRing } from "@/components/admin/ui";
import { InfoTip } from "@/components/admin/ui/InfoTip";
import { AdminSelect } from "@/components/admin/AdminSelect";

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
  | "celebrationStyle"
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

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a PNG, JPG, WebP, or GIF image.");
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
              <img src={value} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <ImagePlus className="h-5 w-5 text-white/70" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{value ? "Image selected" : "Upload image"}</p>
            <p className="mt-1 text-xs leading-5 text-white/70">
              {description ?? "PNG, JPG, WebP, or GIF. Max 2MB."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="admin-button-secondary inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold">
                Choose file
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
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
  const colorInputValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  const harmonySwatches = useMemo(() => {
    try {
      return Array.from(
        new Map(
          generateColorHarmony(value, "analogous")
            .map((swatch) => swatch.toLowerCase())
            .map((swatch) => [swatch, swatch]),
        ).values(),
      ).slice(0, 5);
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
            value={colorInputValue}
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
              maxLength={7}
              spellCheck={false}
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
      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="text-lg font-semibold tracking-[-0.04em] text-white">{title}</h2>
        <InfoTip label={description} align="left" />
      </div>
      <div className="grid gap-4">{children}</div>
    </AnimatedCard>
  );
}

export function AppearanceSettingsManager({
  initialSettings,
  demoMode = false,
}: {
  initialSettings: ResolvedWorkspaceSettings;
  demoMode?: boolean;
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
    themeMode: "dark",
    designStyle: initialSettings.designStyle,
    glassEnabled: initialSettings.glassEnabled,
    glassOpacity: initialSettings.glassOpacity,
    glassBlur: initialSettings.glassBlur,
    celebrationsEnabled: initialSettings.celebrationsEnabled,
    stageCelebrationsEnabled: initialSettings.stageCelebrationsEnabled,
    targetCelebrationsEnabled: initialSettings.targetCelebrationsEnabled,
    celebrationStyle: initialSettings.celebrationStyle,
    loginBackgroundUrl: initialSettings.loginBackgroundUrl || DEFAULT_BACKGROUND,
    loginHeadline: initialSettings.loginHeadline,
    loginSubheadline: initialSettings.loginSubheadline,
  });
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const contrastIssues = useMemo(
    () => getWorkspaceAppearanceContrastIssues({ ...draft, themeMode: "dark" }),
    [draft],
  );

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
    if (contrastIssues.length > 0) {
      setMessage(contrastIssues[0].message);
      return;
    }

    setIsSaving(true);
    setMessage("");

    if (demoMode) {
      setMessage("Appearance updated for this preview.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/settings/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          themeMode: "dark",
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
    <div className="space-y-5">
        <AnimatedCard variant="elevated" animation="none" className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Theme Studio"
            title="Make it yours"
            description="Brand the workspace, login screen, colors, glass, and layout."
            actions={
              <div className="flex flex-wrap gap-3">
                <Link
                  href={appRoutes.dashboard}
                  className="admin-button-secondary ld-focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  View saved dashboard
                </Link>
                <SmoothButton
                  variant="primary"
                  size="md"
                  loading={isSaving}
                  disabled={contrastIssues.length > 0}
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
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm font-semibold",
              contrastIssues.length > 0
                ? "border-amber-300/22 bg-amber-400/10 text-amber-100"
                : "border-emerald-300/18 bg-emerald-400/8 text-emerald-100",
            )}
            role="status"
          >
            <span>{contrastIssues.length > 0 ? "Adjust contrast before saving" : "Contrast protected"}</span>
            <InfoTip
              label={
                contrastIssues.length > 0
                  ? contrastIssues.map((issue) => issue.message).join(" ")
                  : "Workspace surfaces are checked against readable interface text before they can be saved."
              }
              align="right"
            />
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
              <AdminSelect
                value={draft.density}
                onChange={(event) => update("density", event.target.value as AppearanceDraft["density"])}
                className="h-11"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </AdminSelect>
            </label>
            <label className="space-y-2">
              <FieldLabel>Font style</FieldLabel>
              <AdminSelect
                value={draft.fontPreset}
                onChange={(event) => update("fontPreset", event.target.value as AppearanceDraft["fontPreset"])}
                className="h-11"
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
              </AdminSelect>
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
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {CELEBRATION_STYLES.map((style) => {
              const active = draft.celebrationStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => update("celebrationStyle", style)}
                  className={cn(
                    "ld-focus-ring flex h-12 items-center justify-between rounded-2xl border px-4 text-sm font-semibold capitalize transition",
                    active
                      ? "border-[color:var(--ld-color-accent)]/45 bg-[color:var(--ld-color-accent)]/12 text-white"
                      : "border-white/10 bg-white/[0.045] text-white/68 hover:bg-white/[0.075] hover:text-white",
                  )}
                >
                  {style}
                  <span className="flex items-center -space-x-1.5" aria-hidden="true">
                    <span className="h-4 w-4 rounded-full border border-white/30 bg-[color:var(--ld-color-primary)]" />
                    <span className="h-4 w-4 rounded-full border border-white/30 bg-[color:var(--ld-color-accent)]" />
                  </span>
                </button>
              );
            })}
          </div>
        </ThemeSection>
        <AnimatedCard variant="default" animation="fadeInUp" delay={640} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ld-color-accent)]">
                Live on this page
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Review the real interface</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Every control above updates this settings page immediately. Save before opening another page.</p>
            </div>
            <Link
              href={appRoutes.dashboard}
              className="admin-button-secondary ld-focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            >
              <ArrowUpRight className="h-4 w-4" />
              Open saved dashboard
            </Link>
          </div>
        </AnimatedCard>
      </div>
  );
}
