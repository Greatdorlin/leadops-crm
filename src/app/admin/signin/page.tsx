import Link from "next/link";
import { AdminSignInButton } from "@/components/admin/AdminSignInButton";
import { ApprovedDomainRegistrationForm } from "@/components/admin/ApprovedDomainRegistrationForm";
import { EmailPasswordSignInForm } from "@/components/admin/EmailPasswordSignInForm";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
import {
  buildThemeCssVariables,
  resolveBrandLogo,
} from "@/lib/crm/workspace-settings";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import {
  isAdminAuthConfigured,
  isGoogleAuthConfigured,
  isLocalAdminPreviewEnabled,
} from "@/lib/admin-access";
import { appRoutes } from "@/lib/app-routes";
import { getDomainRegistrationPolicy } from "@/lib/auth-registration";

export const dynamic = "force-dynamic";

function getErrorMessage(error?: string) {
  if (error === "AccessDenied") {
    return "We couldn't verify those sign-in details.";
  }

  if (error === "Configuration") {
    return "Sign-in setup is not ready in this environment yet.";
  }

  if (error === "CredentialsSignin") {
    return "We couldn't verify those access details.";
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
  const callbackUrl = params.callbackUrl ?? appRoutes.dashboard;
  const errorMessage = getErrorMessage(params.error);
  const authReady = isAdminAuthConfigured();
  const googleLoginEnabled = isGoogleAuthConfigured();
  const canShowSetupMessage = !authReady && process.env.NODE_ENV !== "production";
  const canUseLocalPreview = !authReady && isLocalAdminPreviewEnabled();
  const [settings, registrationPolicy] = await Promise.all([
    getCompanySettings(),
    getDomainRegistrationPolicy(),
  ]);
  const themeVariables = buildThemeCssVariables(settings);

  return (
    <main
      className="relative grid min-h-dvh place-items-center bg-[#111216] px-5 py-10 text-white sm:px-8 sm:py-16"
      style={{
        ...themeVariables,
        ...(settings.loginBackgroundUrl
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(17,18,22,0.45), rgba(17,18,22,0.8)), url(${settings.loginBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      <div className="relative w-full max-w-md">
        <section aria-labelledby="sign-in-title" className="rounded-[28px] border border-white/10 bg-[#1b1c21] px-6 py-8 shadow-[0_24px_80px_#0004] sm:px-10 sm:py-10">
          <div>
            <LeadsDeskWordmark
              tone="light"
              subtitle=""
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

          <div className="mt-8">
            <h1 id="sign-in-title" className="break-words text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-[2.25rem]">
              {settings.loginHeadline}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/65">{settings.loginSubheadline}</p>
          </div>

          <div className="mt-7 space-y-4">
            {errorMessage ? (
              <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            {canShowSetupMessage ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  Database, authentication secret, and initial admin setup must be configured before this workspace can open.
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
              <div className="space-y-4">
                <EmailPasswordSignInForm callbackUrl={callbackUrl} />
                {googleLoginEnabled ? (
                  <div className="flex items-center gap-3 text-xs font-medium text-white/60">
                    <span className="h-px flex-1 bg-white/10" />
                    or
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                ) : null}
                {googleLoginEnabled ? <AdminSignInButton callbackUrl={callbackUrl} /> : null}
                {registrationPolicy.enabled ? (
                  <details className="border-t border-white/10 pt-4">
                    <summary className="cursor-pointer rounded-sm text-sm font-medium text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">
                      Request workspace access
                    </summary>
                    <div className="mt-4"><ApprovedDomainRegistrationForm /></div>
                  </details>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
