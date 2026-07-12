"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, RotateCcw, Smartphone, WandSparkles } from "lucide-react";
import type { AdminCustomFieldRecord } from "@/lib/crm/custom-fields-admin";
import type { AdminLeadListItem } from "@/lib/crm/view-models";
import type {
  CoreLeadPreviewField,
  LeadPreviewFieldKey,
  ResolvedWorkspaceSettings,
} from "@/lib/crm/workspace-settings";
import { CORE_LEAD_PREVIEW_FIELDS, DEFAULT_LEAD_PREVIEW_CONFIG } from "@/lib/crm/workspace-settings";
import { cn } from "@/lib/cn";
import { GlassSurface, SectionHeader, SmoothButton } from "@/components/admin/ui";
import { LeadDataTable } from "@/components/admin/LeadDataTable";
import type { LeadStageQuickOption } from "@/components/admin/LeadStatusQuickChange";

const fieldLabels: Record<CoreLeadPreviewField, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  company: "Company",
  customer_type: "Lead type",
  source: "Source",
  stage: "Stage",
  owner: "Owner",
  priority: "Priority",
  next_follow_up: "Next follow-up",
  follow_up_status: "Follow-up status",
  estimated_value: "Estimated value",
  expected_close_date: "Expected close date",
  created_date: "Created date",
  last_activity: "Last activity",
  campaign: "Campaign",
  team: "Team",
  branch: "Branch",
  department: "Department",
};

const previewRecipes: Array<{
  label: string;
  description: string;
  desktop: LeadPreviewFieldKey[];
  mobile: LeadPreviewFieldKey[];
}> = [
  {
    label: "Balanced",
    description: "Best for most sales teams.",
    desktop: ["name", "source", "stage", "owner", "next_follow_up", "estimated_value"],
    mobile: ["name", "source", "stage", "owner", "next_follow_up"],
  },
  {
    label: "Conversion",
    description: "Prioritise stage, owner, and close timing.",
    desktop: ["name", "stage", "owner", "priority", "estimated_value", "expected_close_date"],
    mobile: ["name", "stage", "owner", "priority"],
  },
  {
    label: "Intake",
    description: "Surface source and follow-up discipline first.",
    desktop: ["name", "source", "owner", "next_follow_up", "follow_up_status", "created_date"],
    mobile: ["name", "source", "next_follow_up", "follow_up_status"],
  },
];

function FieldChoice({
  label,
  checked,
  onToggle,
  hint,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex min-h-14 items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left transition duration-200",
        checked
          ? "border-white/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_24%,transparent),color-mix(in_srgb,var(--ld-color-accent)_18%,transparent))] text-white shadow-[0_16px_30px_color-mix(in_srgb,var(--ld-color-primary)_16%,transparent),inset_0_1px_0_rgba(255,255,255,0.14)]"
          : "border-white/10 bg-white/[0.045] text-white/70 hover:border-white/18 hover:bg-white/[0.075] hover:text-white",
      )}
      aria-pressed={checked}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block truncate text-xs text-white/70">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
          checked
            ? "border-white/30 bg-white/[0.08] text-white"
            : "border-white/14 bg-white/[0.035] text-transparent group-hover:text-white/60",
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function LeadPreviewSettingsManager({
  initialSettings,
  customFields,
  previewLead,
  currency,
  stageOptions,
  demoMode = false,
}: {
  initialSettings: ResolvedWorkspaceSettings;
  customFields: AdminCustomFieldRecord[];
  previewLead: AdminLeadListItem | null;
  currency: string;
  stageOptions: LeadStageQuickOption[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [desktopColumns, setDesktopColumns] = useState<LeadPreviewFieldKey[]>(initialSettings.leadPreview.desktopColumns);
  const [mobileFields, setMobileFields] = useState<LeadPreviewFieldKey[]>(initialSettings.leadPreview.mobileFields);
  const [maxCustomFieldColumns, setMaxCustomFieldColumns] = useState(initialSettings.leadPreview.maxCustomFieldColumns);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const draftPreviewConfig = {
    ...initialSettings.leadPreview,
    desktopColumns,
    mobileFields,
    maxCustomFieldColumns,
  };

  const selectableCustomFields = useMemo(
    () => customFields.filter((field) => !field.archived),
    [customFields],
  );

  const allFieldOptions: Array<{ key: LeadPreviewFieldKey; label: string; hint?: string }> = [
    ...CORE_LEAD_PREVIEW_FIELDS.map((field) => ({ key: field, label: fieldLabels[field] })),
    ...selectableCustomFields.map((field) => ({
      key: `custom:${field.id}` as const,
      label: field.label,
      hint: field.showInTable ? "Custom field" : "Custom field • enable Table for default visibility",
    })),
  ];

  function toggleValue(list: LeadPreviewFieldKey[], key: LeadPreviewFieldKey) {
    return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
  }

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    if (demoMode) {
      setMessage("Lead preview updated for this preview.");
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/settings/lead-preview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desktopColumns,
          mobileFields,
          maxCustomFieldColumns,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save lead preview settings right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Lead preview updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save lead preview settings right now.");
      setIsSaving(false);
    }
  }

  return (
    <GlassSurface intensity="medium" className="space-y-5 p-5 md:p-6 ld-animate-fade-in-up">
      <SectionHeader
        eyebrow="Lead preview"
        title="Choose what appears in the queue"
        description="Fine-tune the lead table and mobile card views."
      />
      <div>
        <div className="admin-surface-soft rounded-[26px] p-4 md:p-5 ld-animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-200/18 bg-violet-300/10 text-violet-100">
              <WandSparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Quick layout recipes</p>
              <p className="mt-1 text-sm text-white/70">Choose a starting layout.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {previewRecipes.map((recipe) => (
              <button
                key={recipe.label}
                type="button"
                onClick={() => {
                  setDesktopColumns(recipe.desktop);
                  setMobileFields(recipe.mobile);
                }}
                className="group rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-semibold text-white">{recipe.label}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{recipe.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-surface-soft space-y-4 rounded-[26px] p-4 md:p-5">
        <SectionHeader
          eyebrow="Live preview"
          title="Your actual lead queue"
          description="Draft changes appear here before you save."
        />
        <LeadDataTable
          leads={previewLead ? [previewLead] : []}
          emptyTitle="No lead is available to preview"
          emptyDescription="Add a lead, then return here to preview real workspace data."
          previewConfig={draftPreviewConfig}
          currency={currency}
          stageOptions={stageOptions}
          interactiveWorkflow={false}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="admin-surface-soft space-y-4 rounded-[26px] p-4 md:p-5 ld-animate-fade-in-up" style={{ animationDelay: "280ms" }}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/80">
              <Monitor className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Desktop columns</p>
              <p className="mt-1 text-sm text-white/70">Choose what appears in the main lead table.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {allFieldOptions.map((field) => (
              <FieldChoice
                key={field.key}
                label={field.label}
                hint={field.hint}
                checked={desktopColumns.includes(field.key)}
                onToggle={() => setDesktopColumns((current) => toggleValue(current, field.key))}
              />
            ))}
          </div>
        </div>

        <div className="admin-surface-soft space-y-4 rounded-[26px] p-4 md:p-5 ld-animate-fade-in-up" style={{ animationDelay: "320ms" }}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-200/18 bg-violet-300/10 text-violet-100">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Mobile card</p>
              <p className="mt-1 text-sm text-white/70">Keep the compact view useful at a glance.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {allFieldOptions.map((field) => (
              <FieldChoice
                key={`mobile-${field.key}`}
                label={field.label}
                hint={field.hint}
                checked={mobileFields.includes(field.key)}
                onToggle={() => setMobileFields((current) => toggleValue(current, field.key))}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="admin-surface-soft grid gap-4 rounded-[26px] p-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-center ld-animate-fade-in-up" style={{ animationDelay: "360ms" }}>
        <div>
          <p className="text-sm font-semibold text-white">Custom field limit</p>
          <p className="mt-1 text-sm text-white/70">
            Shows up to {maxCustomFieldColumns} custom fields when those leads have saved values.
          </p>
        </div>
        <label className="space-y-2">
          <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            Max custom columns
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-white/72">
              {maxCustomFieldColumns}
            </span>
          </span>
          <input
            type="range"
            min="1"
            max="8"
            value={maxCustomFieldColumns}
            onChange={(event) => setMaxCustomFieldColumns(Number(event.target.value))}
            className="admin-range w-full"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SmoothButton
          variant="secondary"
          size="md"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            setDesktopColumns(DEFAULT_LEAD_PREVIEW_CONFIG.desktopColumns);
            setMobileFields(DEFAULT_LEAD_PREVIEW_CONFIG.mobileFields);
            setMaxCustomFieldColumns(DEFAULT_LEAD_PREVIEW_CONFIG.maxCustomFieldColumns);
          }}
        >
          Reset preview
        </SmoothButton>
        <SmoothButton
          variant="primary"
          size="md"
          loading={isSaving}
          onClick={() => void saveSettings()}
        >
          {isSaving ? "Saving..." : "Save preview"}
        </SmoothButton>
      </div>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </GlassSurface>
  );
}
