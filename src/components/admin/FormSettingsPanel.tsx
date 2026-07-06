"use client";

import { useState } from "react";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { useFormDetail } from "@/components/admin/FormDetailProvider";
import {
  Save,
  AlertCircle,
  Palette,
  Settings,
  UserCheck,
  Sparkles,
  Check,
} from "lucide-react";

export interface FormSettingsData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  isActive: boolean;
  isPublic: boolean;
  successMessage: string;
  redirectUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  enableAutoQualify: boolean;
  autoQualifyRules?: Record<string, unknown>[] | null;
  defaultStatus: string;
  defaultPriority: string;
  defaultSource: string;
  defaultOwnerId?: string | null;
}

interface FormSettingsPanelProps {
  formId: string;
  initialForm: Record<string, unknown> | null;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const DEFAULT_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const DEFAULT_SOURCE_OPTIONS = [
  { value: "website_form", label: "Website Form" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "referral", label: "Referral" },
  { value: "manual_entry", label: "Manual Entry" },
];

const AUTO_QUALIFY_OPERATOR_OPTIONS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "checked", label: "Is checked" },
  { value: "unchecked", label: "Is unchecked" },
  { value: "empty", label: "Is empty" },
  { value: "not_empty", label: "Is filled" },
] as const;

const AUTO_QUALIFY_STAGE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-up" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

function normalizeForm(data: Record<string, unknown> | null): FormSettingsData {
  if (!data) {
    return {
      id: "",
      name: "",
      slug: "",
      description: null,
      status: "draft",
      isActive: true,
      isPublic: true,
      successMessage: "Thank you for your submission.",
      redirectUrl: null,
      primaryColor: null,
      accentColor: null,
      logoUrl: null,
      enableAutoQualify: false,
      autoQualifyRules: null,
      defaultStatus: "new",
      defaultPriority: "medium",
      defaultSource: "website_form",
      defaultOwnerId: null,
    };
  }

  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    slug: String(data.slug ?? ""),
    description: typeof data.description === "string" ? data.description : null,
    status: String(data.status ?? "draft"),
    isActive: data.isActive === true,
    isPublic: data.isPublic !== false,
    successMessage: String(data.successMessage ?? "Thank you for your submission."),
    redirectUrl: typeof data.redirectUrl === "string" ? data.redirectUrl : null,
    primaryColor: typeof data.primaryColor === "string" ? data.primaryColor : null,
    accentColor: typeof data.accentColor === "string" ? data.accentColor : null,
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
    enableAutoQualify: data.enableAutoQualify === true,
    autoQualifyRules: Array.isArray(data.autoQualifyRules) ? data.autoQualifyRules : null,
    defaultStatus: String(data.defaultStatus ?? "new"),
    defaultPriority: String(data.defaultPriority ?? "medium"),
    defaultSource: String(data.defaultSource ?? "website_form"),
    defaultOwnerId: typeof data.defaultOwnerId === "string" ? data.defaultOwnerId : null,
  };
}

export function FormSettingsPanel({ formId, initialForm }: FormSettingsPanelProps) {
  const { fields } = useFormDetail();
  const [draft, setDraft] = useState<FormSettingsData>(normalizeForm(initialForm));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const brandPrimaryColor = draft.primaryColor ?? "#1f4ed8";
  const brandAccentColor = draft.accentColor ?? "#f4b400";

  const updateDraft = (updates: Partial<FormSettingsData>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug,
          description: draft.description,
          status: draft.status,
          isActive: draft.isActive,
          isPublic: draft.isPublic,
          successMessage: draft.successMessage,
          redirectUrl: draft.redirectUrl,
          primaryColor: draft.primaryColor,
          accentColor: draft.accentColor,
          logoUrl: draft.logoUrl,
          enableAutoQualify: draft.enableAutoQualify,
          autoQualifyRules: draft.autoQualifyRules,
          defaultStatus: draft.defaultStatus,
          defaultPriority: draft.defaultPriority,
          defaultSource: draft.defaultSource,
          defaultOwnerId: draft.defaultOwnerId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addAutoQualifyRule = () => {
    const current = draft.autoQualifyRules ?? [];
    updateDraft({
      autoQualifyRules: [
        ...current,
        {
          fieldId: fields[0]?.id ?? "",
          operator: "equals",
          value: "",
          stageKey: "qualified",
          markAsQualified: true,
        },
      ],
    });
  };

  const removeAutoQualifyRule = (idx: number) => {
    const current = draft.autoQualifyRules ?? [];
    updateDraft({ autoQualifyRules: current.filter((_, i) => i !== idx) });
  };

  const updateAutoQualifyRule = (idx: number, updates: Record<string, unknown>) => {
    const current = draft.autoQualifyRules ?? [];
    const next = [...current];
    next[idx] = { ...next[idx], ...updates };
    updateDraft({ autoQualifyRules: next });
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Form Settings"
        description="Configure behavior, branding, and lead routing."
        variant="compact"
        actions={
          <SmoothButton
            variant="primary"
            size="sm"
            icon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={handleSave}
          >
            Save Settings
          </SmoothButton>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-[16px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-[16px] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check className="h-4 w-4 shrink-0" />
          Settings saved successfully.
        </div>
      )}

      <GlassSurface intensity="medium" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-white/70" />
          <h3 className="text-sm font-semibold text-white/90">General</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-white/90">Form Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => updateDraft({ name: e.target.value })}
              className="admin-input w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Slug</label>
            <input
              type="text"
              value={draft.slug}
              onChange={(e) => updateDraft({ slug: e.target.value })}
              className="admin-input w-full"
            />
            <p className="mt-1 text-xs text-white/40">Used in the public URL. No spaces or special characters.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Status</label>
            <AdminSelect
              value={draft.status}
              onChange={(e) => updateDraft({ status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </AdminSelect>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-white/90">Description</label>
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => updateDraft({ description: e.target.value || null })}
              rows={3}
              className="admin-textarea w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => updateDraft({ isActive: e.target.checked })}
                  className="h-4 w-4 accent-[var(--ld-color-primary)]"
                />
                <span className="text-sm text-white/90">Active</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={draft.isPublic}
                  onChange={(e) => updateDraft({ isPublic: e.target.checked })}
                  className="h-4 w-4 accent-[var(--ld-color-primary)]"
                />
                <span className="text-sm text-white/90">Public</span>
              </label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-white/90">Success Message</label>
            <textarea
              value={draft.successMessage}
              onChange={(e) => updateDraft({ successMessage: e.target.value })}
              rows={2}
              className="admin-textarea w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-white/90">Redirect URL (optional)</label>
            <input
              type="text"
              value={draft.redirectUrl ?? ""}
              onChange={(e) => updateDraft({ redirectUrl: e.target.value || null })}
              placeholder="https://example.com/thank-you"
              className="admin-input w-full"
            />
          </div>
        </div>
      </GlassSurface>

      <GlassSurface intensity="medium" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-white/70" />
          <h3 className="text-sm font-semibold text-white/90">Branding</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandPrimaryColor}
                onChange={(e) => updateDraft({ primaryColor: e.target.value })}
                className="h-10 w-10 cursor-pointer overflow-hidden rounded-[10px] border border-white/20 bg-transparent p-0"
              />
              <input
                type="text"
                value={brandPrimaryColor}
                onChange={(e) => updateDraft({ primaryColor: e.target.value })}
                className="admin-input flex-1 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandAccentColor}
                onChange={(e) => updateDraft({ accentColor: e.target.value })}
                className="h-10 w-10 cursor-pointer overflow-hidden rounded-[10px] border border-white/20 bg-transparent p-0"
              />
              <input
                type="text"
                value={brandAccentColor}
                onChange={(e) => updateDraft({ accentColor: e.target.value })}
                className="admin-input flex-1 text-sm"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-white/90">Logo URL</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={draft.logoUrl ?? ""}
                onChange={(e) => updateDraft({ logoUrl: e.target.value || null })}
                placeholder="https://cdn.example.com/logo.png"
                className="admin-input flex-1"
              />
              {draft.logoUrl && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.06]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.logoUrl}
                    alt="Logo preview"
                    className="h-full w-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div
              className="overflow-hidden rounded-[24px] border border-white/10"
              style={{
                background: `linear-gradient(145deg, ${brandPrimaryColor}22, rgba(5,10,20,0.92) 55%, ${brandAccentColor}26)`,
              }}
            >
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                  Live preview
                </p>
              </div>
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.08]"
                      style={{ boxShadow: `0 18px 36px ${brandPrimaryColor}22` }}
                    >
                      {draft.logoUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={draft.logoUrl}
                            alt="Workspace logo preview"
                            className="h-full w-full object-contain p-2"
                          />
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-white/90">LD</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {draft.name.trim() || "Leads Desk intake form"}
                      </p>
                      <p className="text-xs text-white/60">/{draft.slug || "your-form-slug"}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-white/10 bg-black/15 p-4">
                    <p className="text-sm font-semibold text-white">Thank you screen</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      {draft.successMessage || "Thank you for your submission."}
                    </p>
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                  <div
                    className="rounded-[18px] px-4 py-3 text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${brandPrimaryColor}, ${brandAccentColor})`,
                    }}
                  >
                    Submit form
                  </div>
                  <div className="mt-4 grid gap-2">
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-white/65">
                      Button and header colors update here immediately.
                    </div>
                    <div className="rounded-[16px] border border-white/10 bg-black/15 px-3 py-2.5 text-xs text-white/65">
                      Logo preview mirrors the current URL when a valid image loads.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassSurface>

      <GlassSurface intensity="medium" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-white/70" />
          <h3 className="text-sm font-semibold text-white/90">Lead Defaults</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Default Status</label>
            <AdminSelect
              value={draft.defaultStatus}
              onChange={(e) => updateDraft({ defaultStatus: e.target.value })}
            >
              {DEFAULT_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Default Priority</label>
            <AdminSelect
              value={draft.defaultPriority}
              onChange={(e) => updateDraft({ defaultPriority: e.target.value })}
            >
              {DEFAULT_PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Default Source</label>
            <AdminSelect
              value={draft.defaultSource}
              onChange={(e) => updateDraft({ defaultSource: e.target.value })}
            >
              {DEFAULT_SOURCE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Default Owner</label>
            <AdminSelect
              value={draft.defaultOwnerId ?? ""}
              onChange={(e) => updateDraft({ defaultOwnerId: e.target.value || null })}
            >
              <option value="">— Unassigned —</option>
            </AdminSelect>
          </div>
        </div>
      </GlassSurface>

      <GlassSurface intensity="medium" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--ld-color-accent)]" />
          <h3 className="text-sm font-semibold text-white/90">Auto-Qualify</h3>
        </div>
        <div className="space-y-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <input
              type="checkbox"
              checked={draft.enableAutoQualify}
              onChange={(e) => updateDraft({ enableAutoQualify: e.target.checked })}
              className="h-4 w-4 accent-[var(--ld-color-primary)]"
            />
            <span className="text-sm text-white/90">Enable auto-qualify rules</span>
          </label>

          {draft.enableAutoQualify && (
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-white/90">Routing rules</span>
                  <p className="mt-1 text-xs text-white/50">
                    Match form answers and move the lead straight into the right stage.
                  </p>
                </div>
                <SmoothButton size="sm" variant="ghost" onClick={addAutoQualifyRule}>
                  Add Rule
                </SmoothButton>
              </div>
              <div className="space-y-2">
                {(draft.autoQualifyRules ?? []).length === 0 ? (
                  <p className="text-xs text-white/40">No routing rules yet.</p>
                ) : (
                  (draft.autoQualifyRules ?? []).map((rule, idx) => (
                    <div
                      key={idx}
                      className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_190px_minmax(0,1fr)_190px_auto]">
                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                            Field
                          </span>
                          <AdminSelect
                            value={String(rule.fieldId ?? "")}
                            onChange={(e) => updateAutoQualifyRule(idx, { fieldId: e.target.value })}
                            className="h-10"
                          >
                            <option value="">Select field</option>
                            {fields.map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.label}
                              </option>
                            ))}
                          </AdminSelect>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                            Operator
                          </span>
                          <AdminSelect
                            value={String(rule.operator ?? "equals")}
                            onChange={(e) => updateAutoQualifyRule(idx, { operator: e.target.value })}
                            className="h-10"
                          >
                            {AUTO_QUALIFY_OPERATOR_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </AdminSelect>
                        </label>
                        {!["checked", "unchecked", "empty", "not_empty"].includes(
                          String(rule.operator ?? "equals"),
                        ) ? (
                          <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                              Value
                            </span>
                            <input
                              type="text"
                              value={String(rule.value ?? "")}
                              onChange={(e) => updateAutoQualifyRule(idx, { value: e.target.value })}
                              placeholder="Enter match value"
                              className="admin-input h-10 w-full text-sm"
                            />
                          </label>
                        ) : (
                          <div className="rounded-[14px] border border-dashed border-white/10 bg-black/10 px-3 py-2 text-xs text-white/45">
                            No comparison value needed.
                          </div>
                        )}
                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                            Send to stage
                          </span>
                          <AdminSelect
                            value={String(rule.stageKey ?? "qualified")}
                            onChange={(e) =>
                              updateAutoQualifyRule(idx, {
                                stageKey: e.target.value,
                                markAsQualified: e.target.value === "qualified",
                              })
                            }
                            className="h-10"
                          >
                            {AUTO_QUALIFY_STAGE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </AdminSelect>
                        </label>
                        <div className="flex items-end justify-end">
                          <SmoothButton
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 px-0 text-red-400 hover:text-red-300"
                            onClick={() => removeAutoQualifyRule(idx)}
                          >
                            ×
                          </SmoothButton>
                        </div>
                      </div>
                      <div className="mt-3 rounded-[14px] border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/58">
                        If{" "}
                        <span className="font-semibold text-white/78">
                          {fields.find((field) => field.id === String(rule.fieldId ?? ""))?.label ||
                            "this field"}
                        </span>{" "}
                        {String(rule.operator ?? "equals").replace(/_/g, " ")}
                        {!["checked", "unchecked", "empty", "not_empty"].includes(
                          String(rule.operator ?? "equals"),
                        ) && rule.value
                          ? ` "${String(rule.value)}"`
                          : ""}{" "}
                        the lead moves to{" "}
                        <span className="font-semibold text-white/78">
                          {AUTO_QUALIFY_STAGE_OPTIONS.find(
                            (option) => option.value === String(rule.stageKey ?? "qualified"),
                          )?.label ?? "Qualified"}
                        </span>
                        .
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </GlassSurface>
    </div>
  );
}
