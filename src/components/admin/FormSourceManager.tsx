"use client";

import { startTransition, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCcw, RotateCcw } from "lucide-react";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  type AdminFormSourceRecord,
  type FormSourceAdminReferenceData,
} from "@/lib/crm/form-sources-admin";
import { FORM_FIELD_CORE_TARGETS, FORM_SOURCE_TYPES, LEAD_PRIORITIES } from "@/lib/crm/domain";

type MappingDraft = {
  id?: string;
  externalFieldName: string;
  externalFieldLabel: string;
  targetType: "core" | "custom";
  targetField: string;
  customFieldId: string;
  required: boolean;
  fallbackValue: string;
};

function normalizeWebhookSeed(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

function generateWebhookKey(seed: string) {
  const base = normalizeWebhookSeed(seed);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "form_source"}_${suffix}`;
}

function buildSamplePayload(mappings: MappingDraft[]) {
  const defaults: Record<string, string | number> = {
    name: "Ada Okafor",
    email: "lead@example.com",
    phone: "+2348012345678",
    companyName: "Northwind Ventures",
    sourceId: "website",
    campaignLabel: "June Campaign",
    priority: "high",
    estimatedValue: 250000,
    expectedCloseDate: "2026-06-30T10:00:00.000Z",
    notes: "Needs a fast follow-up.",
  };

  return Object.fromEntries(
    mappings.map((mapping, index) => [
      mapping.externalFieldName || `field_${index + 1}`,
      mapping.targetType === "core" && mapping.targetField
        ? defaults[mapping.targetField] ?? `Sample value ${index + 1}`
        : mapping.externalFieldLabel || `Sample value ${index + 1}`,
    ]),
  );
}

type SourceDraft = {
  name: string;
  type: (typeof FORM_SOURCE_TYPES)[number];
  sourceId: string;
  webhookKey: string;
  isActive: boolean;
  defaultStageId: string;
  defaultAssignedUserId: string;
  defaultTeamId: string;
  defaultBranchId: string;
  defaultDepartmentId: string;
  defaultPriority: string;
  mappings: MappingDraft[];
};

const sourceTypeLabels: Record<(typeof FORM_SOURCE_TYPES)[number], string> = {
  website: "Website",
  wordpress: "WordPress Form",
  webhook: "Webhook",
  csv: "CSV Import",
  manual: "Manual Entry",
  ads: "Ads",
  other: "Other",
};

const coreTargetLabels: Record<(typeof FORM_FIELD_CORE_TARGETS)[number], string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  companyName: "Company",
  sourceId: "Source",
  campaignLabel: "Campaign",
  priority: "Priority",
  estimatedValue: "Estimated Value",
  expectedCloseDate: "Expected Close Date",
  notes: "Notes",
};

const priorityLabels: Record<(typeof LEAD_PRIORITIES)[number], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function createEmptyMappingDraft(): MappingDraft {
  return {
    externalFieldName: "",
    externalFieldLabel: "",
    targetType: "core",
    targetField: "name",
    customFieldId: "",
    required: false,
    fallbackValue: "",
  };
}

function createEmptySourceDraft(): SourceDraft {
  return {
    name: "",
    type: "website",
    sourceId: "",
    webhookKey: "",
    isActive: true,
    defaultStageId: "",
    defaultAssignedUserId: "",
    defaultTeamId: "",
    defaultBranchId: "",
    defaultDepartmentId: "",
    defaultPriority: "",
    mappings: [],
  };
}

function buildSourceDraft(source: AdminFormSourceRecord): SourceDraft {
  return {
    name: source.name,
    type: source.type,
    sourceId: source.sourceId ?? "",
    webhookKey: source.webhookKey ?? "",
    isActive: source.isActive,
    defaultStageId: source.defaultStageId ?? "",
    defaultAssignedUserId: source.defaultAssignedUserId ?? "",
    defaultTeamId: source.defaultTeamId ?? "",
    defaultBranchId: source.defaultBranchId ?? "",
    defaultDepartmentId: source.defaultDepartmentId ?? "",
    defaultPriority: source.defaultPriority ?? "",
    mappings: source.mappings.map((mapping) => ({
      id: mapping.id,
      externalFieldName: mapping.externalFieldName,
      externalFieldLabel: mapping.externalFieldLabel ?? "",
      targetType: mapping.targetType,
      targetField: mapping.targetField ?? "",
      customFieldId: mapping.customFieldId ?? "",
      required: mapping.required,
      fallbackValue: mapping.fallbackValue ?? "",
    })),
  };
}

function buildSourcePayload(draft: SourceDraft) {
  return {
    name: draft.name,
    type: draft.type,
    sourceId: draft.sourceId || null,
    webhookKey: draft.webhookKey || null,
    isActive: draft.isActive,
    defaultStageId: draft.defaultStageId || null,
    defaultAssignedUserId: draft.defaultAssignedUserId || null,
    defaultTeamId: draft.defaultTeamId || null,
    defaultBranchId: draft.defaultBranchId || null,
    defaultDepartmentId: draft.defaultDepartmentId || null,
    defaultPriority: draft.defaultPriority || null,
  };
}

function buildMappingsPayload(draft: SourceDraft) {
  return {
    mappings: draft.mappings.map((mapping) => ({
      id: mapping.id,
      externalFieldName: mapping.externalFieldName,
      externalFieldLabel: mapping.externalFieldLabel || null,
      targetType: mapping.targetType,
      targetField: mapping.targetType === "core" ? mapping.targetField || null : null,
      customFieldId: mapping.targetType === "custom" ? mapping.customFieldId || null : null,
      required: mapping.required,
      fallbackValue: mapping.fallbackValue || null,
    })),
  };
}

function SourceDefaultsEditor({
  draft,
  onChange,
  referenceData,
}: {
  draft: SourceDraft;
  onChange: (next: SourceDraft) => void;
  referenceData: FormSourceAdminReferenceData;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Source Name</span>
        <input
          type="text"
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          placeholder="Website contact form"
          className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Source Type</span>
        <AdminSelect
          value={draft.type}
          onChange={(event) => onChange({ ...draft, type: event.target.value as SourceDraft["type"] })}
          className="h-11"
        >
          {FORM_SOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {sourceTypeLabels[type]}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Source ID</span>
        <input
          type="text"
          value={draft.sourceId}
          onChange={(event) => onChange({ ...draft, sourceId: event.target.value })}
          placeholder="landing-page-01"
          className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Webhook Key</span>
        <input
          type="text"
          value={draft.webhookKey}
          onChange={(event) => onChange({ ...draft, webhookKey: event.target.value })}
          placeholder="sales_form_01"
          className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Default Stage</span>
        <AdminSelect
          value={draft.defaultStageId}
          onChange={(event) => onChange({ ...draft, defaultStageId: event.target.value })}
          className="h-11"
        >
          <option value="">No default stage</option>
          {referenceData.stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Default Owner</span>
        <AdminSelect
          value={draft.defaultAssignedUserId}
          onChange={(event) => onChange({ ...draft, defaultAssignedUserId: event.target.value })}
          className="h-11"
        >
          <option value="">No default owner</option>
          {referenceData.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Default Team</span>
        <AdminSelect
          value={draft.defaultTeamId}
          onChange={(event) => onChange({ ...draft, defaultTeamId: event.target.value })}
          className="h-11"
        >
          <option value="">No default team</option>
          {referenceData.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Default Branch</span>
        <AdminSelect
          value={draft.defaultBranchId}
          onChange={(event) => onChange({ ...draft, defaultBranchId: event.target.value })}
          className="h-11"
        >
          <option value="">No default branch</option>
          {referenceData.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Default Department</span>
        <AdminSelect
          value={draft.defaultDepartmentId}
          onChange={(event) => onChange({ ...draft, defaultDepartmentId: event.target.value })}
          className="h-11"
        >
          <option value="">No default department</option>
          {referenceData.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Default Priority</span>
        <AdminSelect
          value={draft.defaultPriority}
          onChange={(event) => onChange({ ...draft, defaultPriority: event.target.value })}
          className="h-11"
        >
          <option value="">No default priority</option>
          {LEAD_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70 sm:col-span-2">
        <span>Active</span>
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
          className="admin-toggle"
        />
      </label>
    </div>
  );
}

function FieldMappingsEditor({
  draft,
  onChange,
  referenceData,
}: {
  draft: SourceDraft;
  onChange: (next: SourceDraft) => void;
  referenceData: FormSourceAdminReferenceData;
}) {
  return (
    <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Field Mappings</p>
          <p className="mt-1 text-sm text-white/54">Map incoming fields to core lead data or custom fields.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...draft, mappings: [...draft.mappings, createEmptyMappingDraft()] })}
          className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
        >
          Add mapping
        </button>
      </div>

      {draft.mappings.length > 0 ? (
        draft.mappings.map((mapping, index) => (
          <div
            key={mapping.id ?? `mapping-${index}`}
            className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] xl:grid-cols-[1.2fr_1.2fr_160px_1fr_1fr_160px_auto]"
          >
            <input
              type="text"
              value={mapping.externalFieldName}
              onChange={(event) => {
                const nextMappings = [...draft.mappings];
                nextMappings[index] = { ...mapping, externalFieldName: event.target.value };
                onChange({ ...draft, mappings: nextMappings });
              }}
              placeholder="full_name"
              className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
            />
            <input
              type="text"
              value={mapping.externalFieldLabel}
              onChange={(event) => {
                const nextMappings = [...draft.mappings];
                nextMappings[index] = { ...mapping, externalFieldLabel: event.target.value };
                onChange({ ...draft, mappings: nextMappings });
              }}
              placeholder="Full Name"
              className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
            />
            <AdminSelect
              value={mapping.targetType}
              onChange={(event) => {
                const nextTargetType = event.target.value as MappingDraft["targetType"];
                const nextMappings = [...draft.mappings];
                nextMappings[index] = {
                  ...mapping,
                  targetType: nextTargetType,
                  targetField: nextTargetType === "core" ? mapping.targetField || "name" : "",
                  customFieldId: nextTargetType === "custom" ? mapping.customFieldId : "",
                };
                onChange({ ...draft, mappings: nextMappings });
              }}
              className="h-11"
            >
              <option value="core">Core Field</option>
              <option value="custom">Custom Field</option>
            </AdminSelect>
            {mapping.targetType === "core" ? (
              <AdminSelect
                value={mapping.targetField}
                onChange={(event) => {
                  const nextMappings = [...draft.mappings];
                  nextMappings[index] = { ...mapping, targetField: event.target.value };
                  onChange({ ...draft, mappings: nextMappings });
                }}
                className="h-11"
              >
                {FORM_FIELD_CORE_TARGETS.map((field) => (
                  <option key={field} value={field}>
                    {coreTargetLabels[field]}
                  </option>
                ))}
              </AdminSelect>
            ) : (
              <AdminSelect
                value={mapping.customFieldId}
                onChange={(event) => {
                  const nextMappings = [...draft.mappings];
                  nextMappings[index] = { ...mapping, customFieldId: event.target.value };
                  onChange({ ...draft, mappings: nextMappings });
                }}
                className="h-11"
              >
                <option value="">Choose custom field</option>
                {referenceData.customFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </AdminSelect>
            )}
            <input
              type="text"
              value={mapping.fallbackValue}
              onChange={(event) => {
                const nextMappings = [...draft.mappings];
                nextMappings[index] = { ...mapping, fallbackValue: event.target.value };
                onChange({ ...draft, mappings: nextMappings });
              }}
              placeholder="Fallback value"
              className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
            />
            <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
              <span>Required</span>
              <input
                type="checkbox"
                checked={mapping.required}
                onChange={(event) => {
                  const nextMappings = [...draft.mappings];
                  nextMappings[index] = { ...mapping, required: event.target.checked };
                  onChange({ ...draft, mappings: nextMappings });
                }}
                className="admin-toggle"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const nextMappings = draft.mappings.filter((_, rowIndex) => rowIndex !== index);
                onChange({ ...draft, mappings: nextMappings });
              }}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-300/24 bg-rose-400/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16"
            >
              Remove
            </button>
          </div>
        ))
      ) : (
        <div className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-sm text-white/52">
          No field mappings yet.
        </div>
      )}
    </div>
  );
}

function FormSourceEditor({
  title,
  draft,
  onChange,
  onSaveSource,
  onSaveMappings,
  referenceData,
  isSaving,
  isSavingMappings,
  message,
  saveLabel,
  showMappings,
  extraAction,
}: {
  title: string;
  draft: SourceDraft;
  onChange: (next: SourceDraft) => void;
  onSaveSource: () => void;
  onSaveMappings?: () => void;
  referenceData: FormSourceAdminReferenceData;
  isSaving: boolean;
  isSavingMappings?: boolean;
  message: string;
  saveLabel: string;
  showMappings: boolean;
  extraAction?: ReactNode;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookPath = draft.webhookKey ? `/api/intake/webhook/${draft.webhookKey}` : "";
  const webhookUrl = webhookPath && origin ? `${origin}${webhookPath}` : webhookPath;
  const samplePayload = useMemo(() => buildSamplePayload(draft.mappings), [draft.mappings]);

  async function copyWebhookUrl() {
    if (!webhookUrl || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(webhookUrl);
    } catch {
      // Ignore clipboard failures in unsupported browsers.
    }
  }

  return (
    <div className="admin-surface-soft space-y-4 rounded-[28px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold text-white">{title}</p>
        {extraAction}
      </div>

      <SourceDefaultsEditor draft={draft} onChange={onChange} referenceData={referenceData} />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Webhook URL</p>
              <p className="mt-1 text-sm text-white/54">
                Use this endpoint when your website or form tool sends leads into Leads Desk.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...draft, webhookKey: generateWebhookKey(draft.name || draft.sourceId || "form_source") })}
                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Regenerate
              </button>
              <button
                type="button"
                disabled={!webhookUrl}
                onClick={() => void copyWebhookUrl()}
                className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium disabled:opacity-60"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70 [overflow-wrap:anywhere]">
            {webhookUrl || "Save or enter a webhook key to generate the webhook URL preview."}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">Webhook key</p>
              <p className="mt-1.5 text-sm text-white/72 [overflow-wrap:anywhere]">
                {draft.webhookKey || "Not set yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">Setup notes</p>
              <p className="mt-1.5 text-sm text-white/72">
                Map the form fields first, then send a JSON POST request to this URL.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div>
            <p className="text-sm font-semibold text-white">Sample Payload</p>
            <p className="mt-1 text-sm text-white/54">
              This example reflects the current field mappings for this source.
            </p>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(samplePayload, null, 2)}
          </pre>
        </div>
      </div>

      {showMappings ? (
        <FieldMappingsEditor draft={draft} onChange={onChange} referenceData={referenceData} />
      ) : null}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveSource}
            className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
          >
            {isSaving ? "Saving..." : saveLabel}
          </button>
          {showMappings && onSaveMappings ? (
            <button
              type="button"
              disabled={isSavingMappings}
              onClick={onSaveMappings}
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
            >
              {isSavingMappings ? "Saving mappings..." : "Save mappings"}
            </button>
          ) : null}
        </div>
        {message ? <p className="text-sm text-white/62">{message}</p> : null}
      </div>
    </div>
  );
}

export function FormSourceManager({
  initialSources,
  referenceData,
}: {
  initialSources: AdminFormSourceRecord[];
  referenceData: FormSourceAdminReferenceData;
}) {
  const router = useRouter();
  const [newSource, setNewSource] = useState<SourceDraft>(createEmptySourceDraft());
  const [newMessage, setNewMessage] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SourceDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [savingMappingsById, setSavingMappingsById] = useState<Record<string, boolean>>({});

  const activeSources = useMemo(
    () => initialSources.filter((source) => source.isActive),
    [initialSources],
  );
  const inactiveSources = useMemo(
    () => initialSources.filter((source) => !source.isActive),
    [initialSources],
  );

  async function createSource() {
    setNewSaving(true);
    setNewMessage("");
    try {
      const response = await fetch("/api/admin/form-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSourcePayload(newSource)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNewMessage(payload?.error ?? "We couldn't save this source right now.");
        setNewSaving(false);
        return;
      }

      setNewSource(createEmptySourceDraft());
      setNewMessage("Source saved.");
      setNewSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setNewMessage("We couldn't save this source right now.");
      setNewSaving(false);
    }
  }

  async function saveSource(sourceId: string) {
    const draft = drafts[sourceId];
    if (!draft) {
      return;
    }

    setSavingById((current) => ({ ...current, [sourceId]: true }));
    setMessages((current) => ({ ...current, [sourceId]: "" }));

    try {
      const response = await fetch(`/api/admin/form-sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSourcePayload(draft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [sourceId]: payload?.error ?? "We couldn't update this source right now.",
        }));
        setSavingById((current) => ({ ...current, [sourceId]: false }));
        return;
      }

      setMessages((current) => ({ ...current, [sourceId]: "Source updated." }));
      setSavingById((current) => ({ ...current, [sourceId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [sourceId]: "We couldn't update this source right now.",
      }));
      setSavingById((current) => ({ ...current, [sourceId]: false }));
    }
  }

  async function saveMappings(sourceId: string) {
    const draft = drafts[sourceId];
    if (!draft) {
      return;
    }

    setSavingMappingsById((current) => ({ ...current, [sourceId]: true }));
    setMessages((current) => ({ ...current, [sourceId]: "" }));

    try {
      const response = await fetch(`/api/admin/form-sources/${sourceId}/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMappingsPayload(draft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [sourceId]: payload?.error ?? "We couldn't save these field mappings right now.",
        }));
        setSavingMappingsById((current) => ({ ...current, [sourceId]: false }));
        return;
      }

      setMessages((current) => ({ ...current, [sourceId]: "Field mappings updated." }));
      setSavingMappingsById((current) => ({ ...current, [sourceId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [sourceId]: "We couldn't save these field mappings right now.",
      }));
      setSavingMappingsById((current) => ({ ...current, [sourceId]: false }));
    }
  }

  async function toggleArchive(sourceId: string, action: "archive" | "restore") {
    setSavingById((current) => ({ ...current, [sourceId]: true }));
    setMessages((current) => ({ ...current, [sourceId]: "" }));

    try {
      const response = await fetch(`/api/admin/form-sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [sourceId]: payload?.error ?? "We couldn't update this source right now.",
        }));
        setSavingById((current) => ({ ...current, [sourceId]: false }));
        return;
      }

      setSavingById((current) => ({ ...current, [sourceId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [sourceId]: "We couldn't update this source right now.",
      }));
      setSavingById((current) => ({ ...current, [sourceId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <FormSourceEditor
        title="Add Source"
        draft={newSource}
        onChange={setNewSource}
        onSaveSource={() => void createSource()}
        referenceData={referenceData}
        isSaving={newSaving}
        message={newMessage}
        saveLabel="Save source"
        showMappings={false}
      />

      <div className="space-y-4">
        {activeSources.map((source) => {
          const isEditing = editingId === source.id;
          const draft = drafts[source.id] ?? buildSourceDraft(source);
          return (
            <div key={source.id} className="admin-surface-soft rounded-[24px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{source.name}</p>
                  <p className="mt-1 text-sm text-white/54">
                    {sourceTypeLabels[source.type]}{source.webhookKey ? ` • ${source.webhookKey}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(isEditing ? null : source.id);
                      setDrafts((current) => ({ ...current, [source.id]: buildSourceDraft(source) }));
                    }}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={savingById[source.id]}
                    onClick={() => void toggleArchive(source.id, "archive")}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-300/24 bg-rose-400/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16"
                  >
                    Archive Source
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/56">
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                  {source.mappings.length} mapping{source.mappings.length === 1 ? "" : "s"}
                </span>
                {source.defaultPriority ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                    {priorityLabels[source.defaultPriority]}
                  </span>
                ) : null}
                {source.defaultStageId ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">Default stage</span>
                ) : null}
                {source.defaultAssignedUserId ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">Default owner</span>
                ) : null}
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <FormSourceEditor
                    title="Edit Source"
                    draft={draft}
                    onChange={(next) => setDrafts((current) => ({ ...current, [source.id]: next }))}
                    onSaveSource={() => void saveSource(source.id)}
                    onSaveMappings={() => void saveMappings(source.id)}
                    referenceData={referenceData}
                    isSaving={Boolean(savingById[source.id])}
                    isSavingMappings={Boolean(savingMappingsById[source.id])}
                    message={messages[source.id] ?? ""}
                    saveLabel="Save changes"
                    showMappings
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold text-white">Archived Sources</p>
          <p className="mt-1 text-sm text-white/54">Restore inactive sources when you want to reuse their mapping setup.</p>
        </div>
        {inactiveSources.length > 0 ? (
          inactiveSources.map((source) => (
            <div key={source.id} className="admin-surface-soft rounded-[24px] p-4 opacity-90">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{source.name}</p>
                  <p className="mt-1 text-sm text-white/54">
                    {sourceTypeLabels[source.type]}{source.webhookKey ? ` • ${source.webhookKey}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingById[source.id]}
                  onClick={() => void toggleArchive(source.id, "restore")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300/24 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/16"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Source
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.035] px-4 py-4 text-sm text-white/52">
            No archived sources yet.
          </div>
        )}
      </div>
    </div>
  );
}
