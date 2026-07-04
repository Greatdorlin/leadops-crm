"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  Save,
  AlertCircle,
  Palette,
  Settings,
  UserCheck,
  Sparkles,
  ImagePlus,
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
  const [draft, setDraft] = useState<FormSettingsData>(normalizeForm(initialForm));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        { fieldId: "", operator: "equals", value: "", markAsQualified: true },
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
        description="Configure how this form behaves, looks, and creates leads."
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
                value={draft.primaryColor ?? "#1f4ed8"}
                onChange={(e) => updateDraft({ primaryColor: e.target.value })}
                className="h-10 w-10 cursor-pointer overflow-hidden rounded-[10px] border border-white/20 bg-transparent p-0"
              />
              <input
                type="text"
                value={draft.primaryColor ?? "#1f4ed8"}
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
                value={draft.accentColor ?? "#f4b400"}
                onChange={(e) => updateDraft({ accentColor: e.target.value })}
                className="h-10 w-10 cursor-pointer overflow-hidden rounded-[10px] border border-white/20 bg-transparent p-0"
              />
              <input
                type="text"
                value={draft.accentColor ?? "#f4b400"}
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
                  <img
                    src={draft.logoUrl}
                    alt="Logo preview"
                    className="h-full w-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <ImagePlus className="h-4 w-4 text-white/30" />
                </div>
              )}
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
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">Rules</span>
                <SmoothButton size="sm" variant="ghost" onClick={addAutoQualifyRule}>
                  Add Rule
                </SmoothButton>
              </div>
              <div className="space-y-2">
                {(draft.autoQualifyRules ?? []).length === 0 ? (
                  <p className="text-xs text-white/40">No auto-qualify rules yet.</p>
                ) : (
                  (draft.autoQualifyRules ?? []).map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2">
                      <span className="text-xs text-white/70">If</span>
                      <input
                        type="text"
                        value={String(rule.fieldId ?? "")}
                        onChange={(e) => updateAutoQualifyRule(idx, { fieldId: e.target.value })}
                        placeholder="field ID"
                        className="admin-input w-24 text-xs"
                      />
                      <span className="text-xs text-white/70">equals</span>
                      <input
                        type="text"
                        value={String(rule.value ?? "")}
                        onChange={(e) => updateAutoQualifyRule(idx, { value: e.target.value })}
                        placeholder="value"
                        className="admin-input flex-1 text-xs"
                      />
                      <span className="text-xs text-white/70">→ mark as qualified</span>
                      <SmoothButton
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 px-0 text-red-400 hover:text-red-300"
                        onClick={() => removeAutoQualifyRule(idx)}
                      >
                        ×
                      </SmoothButton>
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
