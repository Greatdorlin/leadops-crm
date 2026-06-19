"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { AdminCustomFieldRecord } from "@/lib/crm/custom-fields-admin";
import type {
  CoreLeadPreviewField,
  LeadPreviewFieldKey,
  ResolvedWorkspaceSettings,
} from "@/lib/crm/workspace-settings";
import { CORE_LEAD_PREVIEW_FIELDS, DEFAULT_LEAD_PREVIEW_CONFIG } from "@/lib/crm/workspace-settings";

const fieldLabels: Record<CoreLeadPreviewField, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  company: "Company",
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

export function LeadPreviewSettingsManager({
  initialSettings,
  customFields,
}: {
  initialSettings: ResolvedWorkspaceSettings;
  customFields: AdminCustomFieldRecord[];
}) {
  const router = useRouter();
  const [desktopColumns, setDesktopColumns] = useState<LeadPreviewFieldKey[]>(initialSettings.leadPreview.desktopColumns);
  const [mobileFields, setMobileFields] = useState<LeadPreviewFieldKey[]>(initialSettings.leadPreview.mobileFields);
  const [maxCustomFieldColumns, setMaxCustomFieldColumns] = useState(initialSettings.leadPreview.maxCustomFieldColumns);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeCustomFields = useMemo(
    () => customFields.filter((field) => !field.archived && field.showInTable),
    [customFields],
  );

  const allFieldOptions: Array<{ key: LeadPreviewFieldKey; label: string }> = [
    ...CORE_LEAD_PREVIEW_FIELDS.map((field) => ({ key: field, label: fieldLabels[field] })),
    ...activeCustomFields.map((field) => ({ key: `custom:${field.id}` as const, label: field.label })),
  ];

  function toggleValue(list: LeadPreviewFieldKey[], key: LeadPreviewFieldKey) {
    return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
  }

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
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
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Desktop columns</p>
            <p className="mt-1 text-sm text-slate-500">Pick the columns that matter most in the main table.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {allFieldOptions.map((field) => (
              <label key={field.key} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={desktopColumns.includes(field.key)}
                  onChange={() => setDesktopColumns((current) => toggleValue(current, field.key))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Mobile preview</p>
            <p className="mt-1 text-sm text-slate-500">Keep the mobile card view compact and readable.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {allFieldOptions.map((field) => (
              <label key={`mobile-${field.key}`} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={mobileFields.includes(field.key)}
                  onChange={() => setMobileFields((current) => toggleValue(current, field.key))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {field.label}
              </label>
            ))}
          </div>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Max custom columns</span>
            <input
              type="range"
              min="1"
              max="8"
              value={maxCustomFieldColumns}
              onChange={(event) => setMaxCustomFieldColumns(Number(event.target.value))}
              className="w-full"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
        Desktop: {desktopColumns.length} fields selected. Mobile: {mobileFields.length} fields selected.
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setDesktopColumns(DEFAULT_LEAD_PREVIEW_CONFIG.desktopColumns);
            setMobileFields(DEFAULT_LEAD_PREVIEW_CONFIG.mobileFields);
            setMaxCustomFieldColumns(DEFAULT_LEAD_PREVIEW_CONFIG.maxCustomFieldColumns);
          }}
          className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset preview
        </button>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={isSaving}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : "Save preview"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
