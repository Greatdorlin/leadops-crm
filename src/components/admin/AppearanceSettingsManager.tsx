"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import {
  buildThemeCssVariables,
  FONT_PRESETS,
  resolveBrandLogo,
  type ResolvedWorkspaceSettings,
} from "@/lib/crm/workspace-settings";

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

function toOptionalString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
    loginBackgroundUrl: initialSettings.loginBackgroundUrl,
    loginHeadline: initialSettings.loginHeadline,
    loginSubheadline: initialSettings.loginSubheadline,
  });
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const previewStyle = useMemo(
    () =>
      buildThemeCssVariables({
        ...initialSettings,
        ...draft,
      }),
    [draft, initialSettings],
  );

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          logoUrl: toOptionalString(draft.logoUrl ?? ""),
          logoUrlLightMode: toOptionalString(draft.logoUrlLightMode ?? ""),
          logoUrlDarkMode: toOptionalString(draft.logoUrlDarkMode ?? ""),
          faviconUrl: toOptionalString(draft.faviconUrl ?? ""),
          loginLogoUrl: toOptionalString(draft.loginLogoUrl ?? ""),
          loginLogoUrlLightMode: toOptionalString(draft.loginLogoUrlLightMode ?? ""),
          loginLogoUrlDarkMode: toOptionalString(draft.loginLogoUrlDarkMode ?? ""),
          loginBackgroundUrl: toOptionalString(draft.loginBackgroundUrl ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save appearance settings right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Appearance updated.");
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

  return (
    <div className="space-y-6">
      <section className="admin-surface rounded-[28px] p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Company name</span>
                <input
                  type="text"
                  value={draft.companyName}
                  onChange={(event) => update("companyName", event.target.value)}
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Default logo URL</span>
                <input
                  type="url"
                  value={draft.logoUrl ?? ""}
                  onChange={(event) => update("logoUrl", event.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Light mode logo</span>
                <input
                  type="url"
                  value={draft.logoUrlLightMode ?? ""}
                  onChange={(event) => update("logoUrlLightMode", event.target.value)}
                  placeholder="https://example.com/logo-light.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dark mode logo</span>
                <input
                  type="url"
                  value={draft.logoUrlDarkMode ?? ""}
                  onChange={(event) => update("logoUrlDarkMode", event.target.value)}
                  placeholder="https://example.com/logo-dark.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Favicon URL</span>
                <input
                  type="url"
                  value={draft.faviconUrl ?? ""}
                  onChange={(event) => update("faviconUrl", event.target.value)}
                  placeholder="https://example.com/favicon.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Default login logo</span>
                <input
                  type="url"
                  value={draft.loginLogoUrl ?? ""}
                  onChange={(event) => update("loginLogoUrl", event.target.value)}
                  placeholder="https://example.com/login-logo.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Light mode login logo</span>
                <input
                  type="url"
                  value={draft.loginLogoUrlLightMode ?? ""}
                  onChange={(event) => update("loginLogoUrlLightMode", event.target.value)}
                  placeholder="https://example.com/login-logo-light.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dark mode login logo</span>
                <input
                  type="url"
                  value={draft.loginLogoUrlDarkMode ?? ""}
                  onChange={(event) => update("loginLogoUrlDarkMode", event.target.value)}
                  placeholder="https://example.com/login-logo-dark.png"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Login background URL</span>
                <input
                  type="url"
                  value={draft.loginBackgroundUrl ?? ""}
                  onChange={(event) => update("loginBackgroundUrl", event.target.value)}
                  placeholder="https://example.com/login-bg.jpg"
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["primaryColor", "Primary color"],
                ["accentColor", "Accent color"],
                ["backgroundColor", "Background"],
                ["surfaceColor", "Surface"],
                ["cardColor", "Cards"],
                ["sidebarColor", "Sidebar"],
                ["textColor", "Text"],
                ["borderColor", "Borders"],
              ].map(([key, label]) => (
                <label key={key} className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
                  <input
                    type="color"
                    value={draft[key as keyof AppearanceDraft] as string}
                    onChange={(event) => update(key as keyof AppearanceDraft, event.target.value as never)}
                    className="h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-2"
                  />
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rounded corners</span>
                <input
                  type="range"
                  min="8"
                  max="40"
                  value={draft.borderRadius}
                  onChange={(event) => update("borderRadius", Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Font scale</span>
                <input
                  type="range"
                  min="0.9"
                  max="1.15"
                  step="0.01"
                  value={draft.fontScale}
                  onChange={(event) => update("fontScale", Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Font style</span>
                <select
                  value={draft.fontPreset}
                  onChange={(event) => update("fontPreset", event.target.value as AppearanceDraft["fontPreset"])}
                  className="admin-select h-11 w-full rounded-2xl px-4 text-sm outline-none"
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Theme</span>
                <select
                  value={draft.themeMode}
                  onChange={(event) => update("themeMode", event.target.value as AppearanceDraft["themeMode"])}
                  className="admin-select h-11 w-full rounded-2xl px-4 text-sm outline-none"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Design style</span>
                <select
                  value={draft.designStyle}
                  onChange={(event) => update("designStyle", event.target.value as AppearanceDraft["designStyle"])}
                  className="admin-select h-11 w-full rounded-2xl px-4 text-sm outline-none"
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="compact">Compact</option>
                  <option value="liquid_glass">Liquid glass</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Density</span>
                <select
                  value={draft.density}
                  onChange={(event) => update("density", event.target.value as AppearanceDraft["density"])}
                  className="admin-select h-11 w-full rounded-2xl px-4 text-sm outline-none"
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.glassEnabled}
                  onChange={(event) => update("glassEnabled", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Glass effect
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.celebrationsEnabled}
                  onChange={(event) => update("celebrationsEnabled", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Celebrations
              </label>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.stageCelebrationsEnabled}
                  onChange={(event) => update("stageCelebrationsEnabled", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Stage milestones
              </label>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.targetCelebrationsEnabled}
                  onChange={(event) => update("targetCelebrationsEnabled", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Goal celebrations
              </label>
            </div>

            {draft.glassEnabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Glass opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draft.glassOpacity}
                    onChange={(event) => update("glassOpacity", Number(event.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Glass blur</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={draft.glassBlur}
                    onChange={(event) => update("glassBlur", Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid gap-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Login headline</span>
                <input
                  type="text"
                  value={draft.loginHeadline}
                  onChange={(event) => update("loginHeadline", event.target.value)}
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Login subheadline</span>
                <textarea
                  value={draft.loginSubheadline}
                  onChange={(event) => update("loginSubheadline", event.target.value)}
                  rows={3}
                  className="admin-textarea min-h-[96px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live preview</p>
            <div
              className="admin-shell mt-4 overflow-hidden rounded-[28px] border border-slate-200 p-4"
              style={previewStyle}
              data-design-style={draft.designStyle}
              data-density={draft.density}
              data-theme-mode={draft.themeMode}
              data-glass={draft.glassEnabled ? "on" : "off"}
            >
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <aside className="admin-sidebar-panel rounded-[24px] p-4 text-white">
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
                  <div className="mt-4 space-y-2 text-sm text-white/75">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2">Dashboard</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Leads</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Settings</div>
                  </div>
                </aside>
                <div className="space-y-4">
                  <div className="admin-topbar-panel rounded-[24px] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Appearance</p>
                    <h3 className="mt-2 font-[family:var(--font-heading)] text-2xl tracking-[-0.05em] text-slate-950">
                      Premium workspace
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="admin-surface rounded-[24px] p-4">
                      <p className="text-sm font-semibold text-slate-950">Dashboard card</p>
                      <p className="mt-2 text-sm text-slate-500">Overdue follow-ups</p>
                      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">12</p>
                    </div>
                    <div className="admin-surface-muted rounded-[24px] p-4">
                      <p className="text-sm font-semibold text-slate-950">Primary action</p>
                      <button className="admin-button-primary mt-4 inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold">
                        Add lead
                      </button>
                    </div>
                  </div>
                  <div
                    className="admin-surface rounded-[24px] p-5"
                    style={
                      draft.loginBackgroundUrl
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.8)), url(${draft.loginBackgroundUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <LeadsDeskWordmark
                      companyName={draft.companyName}
                      logoUrl={resolveBrandLogo({
                        logoUrl: draft.loginLogoUrl || draft.logoUrl,
                        logoUrlLightMode: draft.loginLogoUrlLightMode || draft.logoUrlLightMode,
                        logoUrlDarkMode: draft.loginLogoUrlDarkMode || draft.logoUrlDarkMode,
                        surfaceMode: "light",
                      })}
                      logoUrlLightMode={draft.loginLogoUrlLightMode || draft.logoUrlLightMode}
                      logoUrlDarkMode={draft.loginLogoUrlDarkMode || draft.logoUrlDarkMode}
                      surfaceMode="light"
                    />
                    <h4 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{draft.loginHeadline}</h4>
                    <p className="mt-2 text-sm text-slate-600">{draft.loginSubheadline}</p>
                    {draft.celebrationsEnabled ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                        Celebration moments are on for stage wins and target milestones.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Brand the workspace without touching code.</p>
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={isSaving}
            className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
          >
            {isSaving ? "Saving..." : "Save appearance"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </section>
    </div>
  );
}
