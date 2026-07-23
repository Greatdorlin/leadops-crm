"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  DatabaseZap,
  LayoutDashboard,
  ListFilter,
  Rows3,
  SlidersHorizontal,
} from "lucide-react";
import { AdminSelect } from "./AdminSelect";
import { SmoothButton } from "./ui/SmoothButton";
import { cn } from "@/lib/cn";
import type {
  IndustryPresetKey,
  VerticalPresetDefinition,
  WorkspaceOnboardingProfile,
} from "@/lib/crm/workspace-settings";

export type OnboardingWorkspaceState = "new" | "existing";
export type OnboardingSetupDepth = "complete" | "layout";

interface IndustrySettingsResponse {
  error?: string;
  completedAt?: string | null;
  industryPreset?: IndustryPresetKey;
  profile?: WorkspaceOnboardingProfile | null;
}

interface WorkspaceOnboardingWizardProps {
  currentPresetKey: IndustryPresetKey;
  initialProfile?: WorkspaceOnboardingProfile | null;
  presets: VerticalPresetDefinition[];
}

export function getRecommendedSetupDepth(
  workspaceState: OnboardingWorkspaceState,
): OnboardingSetupDepth {
  return workspaceState === "new" ? "complete" : "layout";
}

export function buildIndustryPresetPayload(
  presetKey: IndustryPresetKey,
  setupDepth: OnboardingSetupDepth,
  profile: WorkspaceOnboardingProfile,
) {
  return {
    industryPreset: presetKey,
    applyMissingDefaults: setupDepth === "complete",
    profile: {
      ...profile,
      industryPresetId: presetKey,
    },
  };
}

export function getOnboardingImpact(
  preset: VerticalPresetDefinition,
  setupDepth: OnboardingSetupDepth,
) {
  return {
    dashboardWidgets: preset.dashboardWidgets.length,
    leadPreviewFields: preset.leadPreviewDefaults.length,
    stages: setupDepth === "complete" ? preset.stageNames.length : 0,
    sources: setupDepth === "complete" ? preset.sourceNames.length : 0,
    customFields:
      setupDepth === "complete" ? preset.recommendedCustomFields.length : 0,
  };
}

function readableKey(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ["Your setup", "Review", "Ready"];

  return (
    <ol aria-label="Workspace setup progress" className="grid grid-cols-3 gap-2">
      {steps.map((label, index) => {
        const step = index + 1;
        const active = step === currentStep;
        const complete = step < currentStep;

        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2.5 transition",
              active
                ? "border-[color:var(--ld-color-accent)]/45 bg-[color:var(--ld-color-accent)]/10 text-white"
                : complete
                  ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100"
                  : "border-white/8 bg-white/[0.025] text-white/45",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                active
                  ? "border-[color:var(--ld-color-accent)]/45 bg-[color:var(--ld-color-accent)]/15"
                  : complete
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : "border-white/10 bg-white/[0.04]",
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : step}
            </span>
            <span className="truncate text-xs font-semibold sm:text-sm">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkspaceOnboardingWizard({
  currentPresetKey,
  initialProfile,
  presets,
}: WorkspaceOnboardingWizardProps) {
  const router = useRouter();
  const initialWorkspaceState: OnboardingWorkspaceState =
    currentPresetKey === "general_business" ? "new" : "existing";
  const [step, setStep] = useState(1);
  const [workspaceState, setWorkspaceState] =
    useState<OnboardingWorkspaceState>(initialWorkspaceState);
  const [setupDepth, setSetupDepth] = useState<OnboardingSetupDepth>(
    getRecommendedSetupDepth(initialWorkspaceState),
  );
  const [selectedPresetKey, setSelectedPresetKey] =
    useState<IndustryPresetKey>(currentPresetKey);
  const [teamSize, setTeamSize] = useState<WorkspaceOnboardingProfile["teamSize"]>(
    initialProfile?.teamSize ?? "small",
  );
  const [primaryGoal, setPrimaryGoal] = useState<WorkspaceOnboardingProfile["primaryGoal"]>(
    initialProfile?.primaryGoal ?? "pipeline",
  );
  const [salesMotion, setSalesMotion] = useState<WorkspaceOnboardingProfile["salesMotion"]>(
    initialProfile?.salesMotion ?? "team",
  );
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [appliedPreset, setAppliedPreset] =
    useState<VerticalPresetDefinition | null>(null);

  const selectedPreset =
    presets.find((preset) => preset.key === selectedPresetKey) ?? presets[0];

  if (!selectedPreset) {
    return (
      <div className="admin-surface mx-auto max-w-3xl p-6">
        <p className="text-sm font-semibold text-rose-200" role="alert">
          No workspace presets are available.
        </p>
      </div>
    );
  }

  const impact = getOnboardingImpact(selectedPreset, setupDepth);

  function chooseWorkspaceState(nextState: OnboardingWorkspaceState) {
    setWorkspaceState(nextState);
    setSetupDepth(getRecommendedSetupDepth(nextState));
    setError("");
  }

  async function applyPreset() {
    setApplying(true);
    setError("");

    try {
      const profile: WorkspaceOnboardingProfile = {
        industryPresetId: selectedPreset.key,
        teamSize,
        primaryGoal,
        salesMotion,
      };
      const response = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildIndustryPresetPayload(selectedPreset.key, setupDepth, profile),
        ),
      });
      const payload = (await response.json().catch(() => null)) as
        | IndustrySettingsResponse
        | null;

      if (
        !response.ok ||
        payload?.industryPreset !== selectedPreset.key ||
        !payload.completedAt
      ) {
        setError(payload?.error ?? "Workspace setup could not be applied.");
        return;
      }

      const verificationResponse = await fetch("/api/admin/onboarding", {
        cache: "no-store",
      });
      const verification = (await verificationResponse.json().catch(() => null)) as
        | IndustrySettingsResponse
        | null;

      if (
        !verificationResponse.ok ||
        verification?.industryPreset !== selectedPreset.key ||
        !verification.completedAt
      ) {
        setError("The workspace did not confirm the saved preset. Try again.");
        return;
      }

      setAppliedPreset(selectedPreset);
      setStep(3);
      router.refresh();
    } catch {
      setError("Workspace setup could not be applied. Check your connection and retry.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5">
      <StepIndicator currentStep={step} />

      {step === 1 ? (
        <div className="admin-surface overflow-hidden rounded-[28px]">
          <div className="border-b border-white/8 px-5 py-5 sm:px-7 sm:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              Workspace fit
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
              Start with the right sales workflow
            </h2>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="onboarding-industry" className="admin-label">
                  Which industry fits best?
                </label>
                <AdminSelect
                  id="onboarding-industry"
                  value={selectedPresetKey}
                  onChange={(event) => {
                    setSelectedPresetKey(event.target.value as IndustryPresetKey);
                    setError("");
                  }}
                  aria-label="Choose an industry preset"
                >
                  {presets.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <fieldset className="space-y-2.5">
                <legend className="admin-label">What are you setting up?</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {([
                    {
                      value: "new" as const,
                      label: "New workspace",
                      detail: "Add a complete starter workflow.",
                    },
                    {
                      value: "existing" as const,
                      label: "Existing workspace",
                      detail: "Start with the safer layout-only option.",
                    },
                  ]).map((option) => {
                    const selected = workspaceState === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseWorkspaceState(option.value)}
                        className={cn(
                          "ld-focus-ring min-h-[88px] rounded-[20px] border p-4 text-left transition",
                          selected
                            ? "border-[color:var(--ld-color-primary)]/50 bg-[color:var(--ld-color-primary)]/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                            : "border-white/9 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.055]",
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white">{option.label}</span>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--ld-color-accent)]" />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-white/50">
                          {option.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="onboarding-team-size" className="admin-label">Team size</label>
                  <AdminSelect id="onboarding-team-size" value={teamSize} onChange={(event) => setTeamSize(event.target.value as WorkspaceOnboardingProfile["teamSize"])}>
                    <option value="solo">Just me</option>
                    <option value="small">2-10 people</option>
                    <option value="growing">11-50 people</option>
                    <option value="large">51+ people</option>
                  </AdminSelect>
                </div>
                <div className="space-y-2">
                  <label htmlFor="onboarding-primary-goal" className="admin-label">Main goal</label>
                  <AdminSelect id="onboarding-primary-goal" value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value as WorkspaceOnboardingProfile["primaryGoal"])}>
                    <option value="capture">Capture leads</option>
                    <option value="follow_up">Improve follow-up</option>
                    <option value="pipeline">Grow pipeline</option>
                    <option value="reporting">Improve reporting</option>
                  </AdminSelect>
                </div>
                <div className="space-y-2">
                  <label htmlFor="onboarding-sales-motion" className="admin-label">Sales setup</label>
                  <AdminSelect id="onboarding-sales-motion" value={salesMotion} onChange={(event) => setSalesMotion(event.target.value as WorkspaceOnboardingProfile["salesMotion"])}>
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="multi_branch">Multiple branches</option>
                  </AdminSelect>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-depth" className="admin-label">
                  How much should Leads Desk configure?
                </label>
                <AdminSelect
                  id="onboarding-depth"
                  value={setupDepth}
                  onChange={(event) => {
                    setSetupDepth(event.target.value as OnboardingSetupDepth);
                    setError("");
                  }}
                  aria-label="Choose setup depth"
                >
                  <option value="complete">Complete starter setup</option>
                  <option value="layout">Dashboard and lead preview only</option>
                </AdminSelect>
                <p className="text-xs leading-5 text-white/48">
                  {setupDepth === "complete"
                    ? "Adds only missing stages, sources, and fields. Existing records stay intact."
                    : "Updates the saved preset, dashboard, and lead preview without adding workflow items."}
                </p>
              </div>
            </div>

            <aside className="rounded-[24px] border border-white/9 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/10 bg-white/[0.07] text-[color:var(--ld-color-accent)]">
                  <SlidersHorizontal className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    Recommended preset
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{selectedPreset.label}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/58">{selectedPreset.description}</p>
              <dl className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-white/40">Pipeline</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{impact.stages || selectedPreset.stageNames.length}</dd>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-white/40">Lead fields</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{impact.customFields || selectedPreset.recommendedCustomFields.length}</dd>
                </div>
              </dl>
            </aside>
          </div>

          <div className="flex justify-end border-t border-white/8 px-5 py-4 sm:px-7">
            <SmoothButton
              variant="primary"
              onClick={() => {
                setError("");
                setStep(2);
              }}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Review setup
            </SmoothButton>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="admin-surface overflow-hidden rounded-[28px] pb-24 sm:pb-0">
          <div className="border-b border-white/8 px-5 py-5 sm:px-7 sm:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Review</p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                  {selectedPreset.label}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Existing stages, sources, fields, and lead records will not be deleted.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[color:var(--ld-color-accent)]/25 bg-[color:var(--ld-color-accent)]/10 px-3 py-1.5 text-xs font-semibold text-white/78">
                {setupDepth === "complete" ? "Complete setup" : "Layout only"}
              </span>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
            <div className="space-y-5">
              <PreviewGroup
                icon={<ListFilter className="h-4 w-4" />}
                title={`Pipeline stages (${selectedPreset.stageNames.length})`}
                muted={setupDepth === "layout"}
                items={selectedPreset.stageNames}
              />
              <PreviewGroup
                icon={<DatabaseZap className="h-4 w-4" />}
                title={`Lead sources (${selectedPreset.sourceNames.length})`}
                muted={setupDepth === "layout"}
                items={selectedPreset.sourceNames}
              />
              <PreviewGroup
                icon={<SlidersHorizontal className="h-4 w-4" />}
                title={`Custom fields (${selectedPreset.recommendedCustomFields.length})`}
                muted={setupDepth === "layout"}
                items={selectedPreset.recommendedCustomFields.map((field) => field.label)}
              />
            </div>

            <div className="space-y-5">
              <PreviewGroup
                icon={<LayoutDashboard className="h-4 w-4" />}
                title={`Dashboard widgets (${impact.dashboardWidgets})`}
                items={selectedPreset.dashboardWidgets.map(readableKey)}
              />
              <PreviewGroup
                icon={<Rows3 className="h-4 w-4" />}
                title={`Lead preview (${impact.leadPreviewFields})`}
                items={selectedPreset.leadPreviewDefaults.map(readableKey)}
              />
            </div>
          </div>

          {error ? (
            <p className="mx-5 mb-4 rounded-2xl border border-rose-300/20 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100 sm:mx-7" role="alert">
              {error}
            </p>
          ) : null}

          <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-[20px] border border-white/12 bg-[color:color-mix(in_srgb,var(--ld-color-background)_88%,transparent)] p-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:static sm:justify-between sm:rounded-none sm:border-x-0 sm:border-b-0 sm:bg-white/[0.025] sm:px-7 sm:py-4 sm:shadow-none">
            <SmoothButton
              variant="ghost"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              disabled={applying}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </SmoothButton>
            <SmoothButton
              variant="primary"
              onClick={applyPreset}
              disabled={applying}
              icon={applying ? undefined : <Check className="h-4 w-4" />}
              className="ml-auto"
            >
              {applying ? "Applying..." : "Apply workspace setup"}
            </SmoothButton>
          </div>
        </div>
      ) : null}

      {step === 3 && appliedPreset ? (
        <div className="admin-surface mx-auto max-w-3xl overflow-hidden rounded-[28px] text-center">
          <div className="px-5 py-10 sm:px-8 sm:py-14">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-emerald-300/25 bg-emerald-300/10 text-emerald-200 shadow-[0_18px_50px_rgba(16,185,129,0.12)]">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
              Saved and verified
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              {appliedPreset.label} is ready
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/52">
              Your preset, dashboard, and lead preview are active.
              {setupDepth === "complete" ? " Missing workflow defaults were added without replacing existing items." : " Existing workflow items were left unchanged."}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
              <SmoothButton variant="primary" onClick={() => router.push("/dashboard")}>
                Open dashboard
              </SmoothButton>
              <SmoothButton variant="secondary" onClick={() => router.push("/settings/industry")}>
                Review industry settings
              </SmoothButton>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewGroup({
  icon,
  items,
  muted = false,
  title,
}: {
  icon: React.ReactNode;
  items: string[];
  muted?: boolean;
  title: string;
}) {
  return (
    <section className={cn("space-y-3", muted && "opacity-45")}>
      <div className="flex items-center gap-2 text-white/72">
        <span className="text-[color:var(--ld-color-accent)]">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        {muted ? (
          <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
            Not added
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/9 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/62"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
