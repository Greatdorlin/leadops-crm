import Link from "next/link";
import { AdminSignInButton } from "@/components/admin/AdminSignInButton";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import {
  buildThemeCssVariables,
  getCompanySettings,
  resolveBrandLogo,
} from "@/lib/crm/workspace-settings";
import {
  isAdminAuthConfigured,
  isLocalAdminPreviewEnabled,
} from "@/lib/admin-access";

export const dynamic = "force-dynamic";

function getErrorMessage(error?: string) {
  if (error === "AccessDenied") {
    return "This Google account does not have access to the admin area.";
  }

  if (error === "Configuration") {
    return "Sign-in setup is not ready in this environment yet.";
  }

  if (error) {
    return "We couldn't sign you in right now. Please try again.";
  }

  return null;
}

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/admin";
  const errorMessage = getErrorMessage(params.error);
  const authReady = isAdminAuthConfigured();
  const canShowSetupMessage = !authReady && process.env.NODE_ENV !== "production";
  const canUseLocalPreview = !authReady && isLocalAdminPreviewEnabled();
  const settings = await getCompanySettings();
  const themeVariables = buildThemeCssVariables(settings);

  return (
    <main
      className="admin-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-white sm:px-6"
      style={{
        ...themeVariables,
        ...(settings.loginBackgroundUrl
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.24), rgba(2,6,23,0.76)), url(${settings.loginBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
      data-design-style={settings.designStyle}
      data-density={settings.density}
      data-theme-mode={settings.themeMode}
      data-glass={settings.glassEnabled ? "on" : "off"}
      data-glass-style={settings.glassEnabled ? "vibrant" : "off"}
    >
      <div className="ld-bg-overlay" aria-hidden="true" />
      <div className="w-full max-w-[34rem]">
        <section className="ld-glass ld-glass-vibrant ld-glass-card ld-inner-highlight rounded-[34px] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-8">
          <div className="flex justify-center">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.07] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <LeadsDeskWordmark
                tone="light"
                companyName={settings.companyName}
                logoUrl={resolveBrandLogo({
                  logoUrl: settings.loginLogoUrl || settings.logoUrl,
                  logoUrlLightMode: settings.loginLogoUrlLightMode || settings.logoUrlLightMode,
                  logoUrlDarkMode: settings.loginLogoUrlDarkMode || settings.logoUrlDarkMode,
                  surfaceMode: "dark",
                })}
                logoUrlLightMode={settings.loginLogoUrlLightMode || settings.logoUrlLightMode}
                logoUrlDarkMode={settings.loginLogoUrlDarkMode || settings.logoUrlDarkMode}
                surfaceMode="dark"
              />
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
              Private workspace
            </p>
            <h1 className="mt-3 font-[family:var(--font-heading)] text-[2.25rem] leading-[1.02] tracking-[-0.06em] text-white sm:text-[2.7rem]">
              {settings.loginHeadline}
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/66 sm:text-base">
              {settings.loginSubheadline}
            </p>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {canShowSetupMessage ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Google sign-in and initial admin setup need configuration before admin can open.
                </div>
                {canUseLocalPreview ? (
                  <Link
                    href={callbackUrl}
                    className="admin-button-primary inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
                  >
                    Open local preview
                  </Link>
                ) : null}
              </div>
            ) : (
              <AdminSignInButton callbackUrl={callbackUrl} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
