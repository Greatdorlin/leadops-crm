import Link from "next/link";
import { AdminSignInButton } from "@/components/admin/AdminSignInButton";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";
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

  return (
    <main className="admin-shell flex min-h-screen items-center justify-center px-4 py-12 text-slate-950 sm:px-6">
      <div className="w-full max-w-[34rem]">
        <section className="admin-surface rounded-[30px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex justify-center">
            <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <LeadsDeskWordmark />
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b123f]/52">
              Admin sign-in
            </p>
            <h1 className="mt-3 font-[family:var(--font-heading)] text-[2rem] leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
              Sign in to Leads Desk
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Use your approved Google account to open the workspace.
            </p>
          </div>

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-white/84 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
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
