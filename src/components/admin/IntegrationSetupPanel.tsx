import { CopyButton } from "./CopyButton";
import { Check, KeyRound, LockKeyhole, Send, Settings2 } from "lucide-react";
import { IntegrationVerifyButton } from "@/components/admin/IntegrationVerifyButton";
import { SectionHeader } from "@/components/admin/SectionHeader";

interface SetupStep {
  title: string;
  description: string;
}

export function IntegrationSetupPanel({
  provider,
  title,
  description,
  configured,
  steps,
  permissions,
  previewMode = false,
  verificationMode = "provider",
  callbackUrl,
}: {
  callbackUrl?: string;
  provider: string;
  title: string;
  description: string;
  configured: boolean;
  steps: readonly SetupStep[];
  permissions: readonly string[];
  previewMode?: boolean;
  verificationMode?: "provider" | "delivery";
}) {
  return (
    <section id="setup" className="admin-surface min-w-0 scroll-mt-24 rounded-[24px] p-4 sm:p-5">
      <SectionHeader
        eyebrow="Guided setup"
        title={title}
        description={description}
      />

      <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-semibold text-white">
          {configured ? "1. Account details are in place" : "1. Add your account details"}
        </p>
        <p className="text-sm leading-6 text-white/65">
          {configured
            ? "Continue with a test to confirm this client’s connection."
            : "Your setup operator adds this client’s provider credentials to this installation. Open Technical setup below for the exact values."}
        </p>
        {callbackUrl ? (
          <div className="min-w-0 space-y-2 border-t border-white/10 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">2. Copy your webhook URL</p>
              <CopyButton text={callbackUrl} className="min-h-11 px-3" />
            </div>
            <code className="block select-all rounded-lg bg-black/20 p-3 text-xs leading-6 text-white/80 [overflow-wrap:anywhere]">{callbackUrl}</code>
            <p className="text-sm leading-6 text-white/65">Paste this URL into the provider’s webhook or lead-delivery setting. Each client installation has its own URL.</p>
          </div>
        ) : null}
        <p className="border-t border-white/10 pt-3 text-sm text-white/70">
          {callbackUrl ? "3" : "2"}. Verify access, then send a test from the provider and check its result here.
        </p>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <details className="min-w-0">
          <summary className="cursor-pointer rounded-lg px-1 py-3 text-sm font-semibold text-white/80 focus-visible:outline-2">Technical setup</summary>
          <ol className="mt-3 min-w-0 space-y-3">
          {steps.map((step, index) => {
            const StepIcon = index === 0 ? KeyRound : index === 1 ? Settings2 : Send;
            return (
              <li
                key={step.title}
                className="admin-surface-muted flex gap-3 rounded-2xl p-4"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[var(--ld-color-accent)]">
                  <StepIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/64 [overflow-wrap:anywhere]">{step.description}</p>
                </div>
              </li>
            );
          })}
          </ol>
        </details>

        <aside className="min-w-0 space-y-4 rounded-[20px] border border-white/10 bg-black/15 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-100">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Private by design</p>
              <p className="mt-1 text-xs leading-5 text-white/60">
                Credentials stay in deployment secrets. Leads Desk never sends secret values to this page.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">
              Required provider access
            </p>
            <ul className="mt-2 space-y-2">
              {permissions.map((permission) => (
                <li key={permission} className="flex gap-2 text-sm leading-5 text-white/72">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                  {permission}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-xs leading-5 text-white/58">
              {configured
                ? verificationMode === "provider"
                  ? "Server setup is present. Verify provider access before treating this connection as live."
                  : "Server setup is present. A real test lead is still required before delivery is verified."
                : "Add the required values in your deployment, then return here to verify."}
            </p>
            <IntegrationVerifyButton
              provider={provider}
              disabled={!configured}
              previewMode={previewMode}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
