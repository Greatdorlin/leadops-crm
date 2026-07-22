"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, LayoutTemplate, Plus, RotateCcw, Settings2, TableProperties } from "lucide-react";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  type AdminCustomFieldRecord,
} from "@/lib/crm/custom-fields-admin";
import { CUSTOM_FIELD_TYPES } from "@/lib/crm/domain";
import { crmLabelize } from "@/lib/crm/formatters";
import { cn } from "@/lib/cn";

type OptionDraft = {
  id?: string;
  label: string;
  value: string;
  color: string;
  sortOrder: number;
  archived: boolean;
};

type FieldDraft = {
  label: string;
  key: string;
  type: (typeof CUSTOM_FIELD_TYPES)[number];
  description: string;
  placeholder: string;
  required: boolean;
  showInTable: boolean;
  showInForm: boolean;
  showInDetails: boolean;
  searchable: boolean;
  filterable: boolean;
  sortOrder: number;
  options: OptionDraft[];
};

function isSelectLikeFieldType(type: FieldDraft["type"]) {
  return type === "select" || type === "multi_select";
}

function createEmptyOption(sortOrder = 0): OptionDraft {
  return {
    label: "",
    value: "",
    color: "",
    sortOrder,
    archived: false,
  };
}

function createEmptyFieldDraft(): FieldDraft {
  return {
    label: "",
    key: "",
    type: "text",
    description: "",
    placeholder: "",
    required: false,
    showInTable: false,
    showInForm: true,
    showInDetails: true,
    searchable: false,
    filterable: false,
    sortOrder: 0,
    options: [],
  };
}

const quickStartTemplates: Array<{
  label: string;
  description: string;
  draft: Partial<FieldDraft>;
}> = [
  {
    label: "Budget",
    description: "Track expected spend or value range.",
    draft: {
      label: "Budget",
      key: "budget",
      type: "currency",
      placeholder: "Enter estimated budget",
      showInTable: true,
      filterable: true,
    },
  },
  {
    label: "Urgency",
    description: "Help the team qualify how soon action is needed.",
    draft: {
      label: "Urgency",
      key: "urgency",
      type: "select",
      showInTable: true,
      filterable: true,
      options: [
        { label: "Low", value: "low", color: "#60a5fa", sortOrder: 0, archived: false },
        { label: "Medium", value: "medium", color: "#fbbf24", sortOrder: 1, archived: false },
        { label: "High", value: "high", color: "#f97316", sortOrder: 2, archived: false },
      ],
    },
  },
  {
    label: "Region",
    description: "Add a locale-specific area beyond the core location fields.",
    draft: {
      label: "Region",
      key: "region_detail",
      type: "text",
      placeholder: "Enter business region",
      filterable: true,
    },
  },
  {
    label: "Preferred contact time",
    description: "Capture the best time to call or follow up.",
    draft: {
      label: "Preferred Contact Time",
      key: "preferred_contact_time",
      type: "text",
      placeholder: "Morning, afternoon, or a specific time",
      showInDetails: true,
    },
  },
];

function buildFieldDraft(field: AdminCustomFieldRecord): FieldDraft {
  return {
    label: field.label,
    key: field.key,
    type: field.type,
    description: field.description ?? "",
    placeholder: field.placeholder ?? "",
    required: field.required,
    showInTable: field.showInTable,
    showInForm: field.showInForm,
    showInDetails: field.showInDetails,
    searchable: field.searchable,
    filterable: field.filterable,
    sortOrder: field.sortOrder,
    options: field.options.map((option, index) => ({
      id: option.id,
      label: option.label,
      value: option.value,
      color: option.color ?? "",
      sortOrder: option.sortOrder ?? index,
      archived: option.archived,
    })),
  };
}

function buildPayload(draft: FieldDraft) {
  return {
    ...draft,
    key: draft.key || null,
    description: draft.description || null,
    placeholder: draft.placeholder || null,
    options: draft.options.map((option, index) => ({
      id: option.id,
      label: option.label,
      value: option.value || null,
      color: option.color || null,
      sortOrder: option.sortOrder ?? index,
      archived: option.archived,
    })),
  };
}

function FieldFlags({
  draft,
  onToggle,
}: {
  draft: FieldDraft;
  onToggle: (key: keyof FieldDraft, checked: boolean) => void;
}) {
  const flags: Array<{ key: keyof FieldDraft; label: string }> = [
    { key: "required", label: "Required" },
    { key: "showInForm", label: "Show in Form" },
    { key: "showInTable", label: "Show in Table" },
    { key: "showInDetails", label: "Show in Lead Details" },
    { key: "searchable", label: "Searchable" },
    { key: "filterable", label: "Filterable" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {flags.map((flag) => (
        <label
          key={flag.key}
          className={cn(
            "flex min-h-14 items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-sm transition",
            Boolean(draft[flag.key])
              ? "border-white/20 bg-white/[0.08] text-white"
              : "border-white/10 bg-white/[0.045] text-white/70",
          )}
        >
          <span>{flag.label}</span>
          <input
            type="checkbox"
            checked={Boolean(draft[flag.key])}
            onChange={(event) => onToggle(flag.key, event.target.checked)}
            className="admin-toggle shrink-0"
          />
        </label>
      ))}
    </div>
  );
}

function FieldOptionsEditor({
  options,
  onChange,
}: {
  options: OptionDraft[];
  onChange: (next: OptionDraft[]) => void;
}) {
  const visibleOptions = options.filter((option) => !option.archived);

  return (
    <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Options</p>
        <button
          type="button"
          onClick={() => onChange([...options, createEmptyOption(options.length)])}
          className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add option
        </button>
      </div>

      {visibleOptions.length > 0 ? (
        visibleOptions.map((option) => {
          const optionIndex = options.findIndex((item) => item === option);
          return (
            <div key={option.id ?? `option-${optionIndex}`} className="grid gap-3 lg:grid-cols-[1fr_1fr_140px_auto]">
              <input
                type="text"
                value={option.label}
                onChange={(event) => {
                  const next = [...options];
                  next[optionIndex] = { ...option, label: event.target.value };
                  onChange(next);
                }}
                placeholder="Option label"
                className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
              />
              <input
                type="text"
                value={option.value}
                onChange={(event) => {
                  const next = [...options];
                  next[optionIndex] = { ...option, value: event.target.value };
                  onChange(next);
                }}
                placeholder="Option value"
                className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
              />
              <input
                type="text"
                value={option.color}
                onChange={(event) => {
                  const next = [...options];
                  next[optionIndex] = { ...option, color: event.target.value };
                  onChange(next);
                }}
                placeholder="#2563eb"
                className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const next = [...options];
                  next[optionIndex] = { ...option, archived: true };
                  onChange(next);
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/16"
              >
                Archive
              </button>
            </div>
          );
        })
      ) : (
        <p className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] px-4 py-3 text-sm text-white/70">
          No options yet. Add at least one option for this field.
        </p>
      )}
    </div>
  );
}

function CustomFieldEditor({
  title,
  draft,
  onChange,
  onSave,
  isSaving,
  message,
  saveLabel,
  extraAction,
}: {
  title: string;
  draft: FieldDraft;
  onChange: (next: FieldDraft) => void;
  onSave: () => void;
  isSaving: boolean;
  message: string;
  saveLabel: string;
  extraAction?: React.ReactNode;
}) {
  return (
    <div className="admin-surface-soft space-y-4 rounded-[26px] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/80">
            <Settings2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-white/70">Choose where this field appears.</p>
          </div>
        </div>
        {extraAction}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Field Name</span>
          <input
            type="text"
            value={draft.label}
            onChange={(event) => onChange({ ...draft, label: event.target.value })}
            placeholder="Budget"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Field Key</span>
          <input
            type="text"
            value={draft.key}
            onChange={(event) => onChange({ ...draft, key: event.target.value })}
            placeholder="budget"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Field Type</span>
          <AdminSelect
            value={draft.type}
            onChange={(event) =>
              onChange({
                ...draft,
                type: event.target.value as FieldDraft["type"],
                options: isSelectLikeFieldType(event.target.value as FieldDraft["type"])
                  ? draft.options
                  : draft.options.map((option) => ({ ...option, archived: true })),
              })
            }
            className="h-11"
          >
            {CUSTOM_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {crmLabelize(type)}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Order</span>
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value || 0) })}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Placeholder</span>
          <input
            type="text"
            value={draft.placeholder}
            onChange={(event) => onChange({ ...draft, placeholder: event.target.value })}
            placeholder="Enter value"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Help Text</span>
          <textarea
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            rows={3}
            placeholder="Short helper text for the team."
            className="admin-input min-h-[96px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
          />
        </label>
      </div>

      <FieldFlags
        draft={draft}
        onToggle={(key, checked) => onChange({ ...draft, [key]: checked })}
      />

      {isSelectLikeFieldType(draft.type) ? (
        <FieldOptionsEditor
          options={draft.options}
          onChange={(next) => onChange({ ...draft, options: next })}
        />
      ) : null}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
        {message ? <p className="text-sm text-white/70">{message}</p> : null}
      </div>
    </div>
  );
}

export function CustomFieldManager({
  initialFields,
  demoMode = false,
}: {
  initialFields: AdminCustomFieldRecord[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [newField, setNewField] = useState<FieldDraft>(createEmptyFieldDraft());
  const [newMessage, setNewMessage] = useState("");
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});

  const activeFields = useMemo(
    () => initialFields.filter((field) => !field.archived),
    [initialFields],
  );
  const archivedFields = useMemo(
    () => initialFields.filter((field) => field.archived),
    [initialFields],
  );

  async function createField() {
    if (demoMode) { setNewMessage("Field added for this preview."); return; }
    setNewSaving(true);
    setNewMessage("");
    try {
      const response = await fetch("/api/admin/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(newField)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNewMessage(payload?.error ?? "We couldn't save this field right now.");
        setNewSaving(false);
        return;
      }

      setNewField(createEmptyFieldDraft());
      setNewMessage("Field saved.");
      setNewSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setNewMessage("We couldn't save this field right now.");
      setNewSaving(false);
    }
  }

  async function saveField(fieldId: string) {
    const draft = drafts[fieldId];
    if (!draft) {
      return;
    }
    if (demoMode) { setMessages((current) => ({ ...current, [fieldId]: "Field updated for this preview." })); return; }

    setSavingById((current) => ({ ...current, [fieldId]: true }));
    setMessages((current) => ({ ...current, [fieldId]: "" }));

    try {
      const response = await fetch(`/api/admin/custom-fields/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(draft)),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [fieldId]: payload?.error ?? "We couldn't update this field right now.",
        }));
        setSavingById((current) => ({ ...current, [fieldId]: false }));
        return;
      }

      setMessages((current) => ({ ...current, [fieldId]: "Field updated." }));
      setSavingById((current) => ({ ...current, [fieldId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [fieldId]: "We couldn't update this field right now.",
      }));
      setSavingById((current) => ({ ...current, [fieldId]: false }));
    }
  }

  async function toggleArchive(fieldId: string, action: "archive" | "restore") {
    if (demoMode) { setMessages((current) => ({ ...current, [fieldId]: `Field ${action === "archive" ? "archived" : "restored"} for this preview.` })); return; }
    setSavingById((current) => ({ ...current, [fieldId]: true }));
    setMessages((current) => ({ ...current, [fieldId]: "" }));
    try {
      const response = await fetch(`/api/admin/custom-fields/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [fieldId]: payload?.error ?? "We couldn't update this field right now.",
        }));
        setSavingById((current) => ({ ...current, [fieldId]: false }));
        return;
      }

      setSavingById((current) => ({ ...current, [fieldId]: false }));
      startTransition(() => router.refresh());
    } catch {
      setMessages((current) => ({
        ...current,
        [fieldId]: "We couldn't update this field right now.",
      }));
      setSavingById((current) => ({ ...current, [fieldId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Active fields
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{activeFields.length}</p>
          <p className="mt-2 text-sm text-white/70">Live across forms, tables, and lead details.</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Table-ready
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
            {activeFields.filter((field) => field.showInTable).length}
          </p>
          <p className="mt-2 text-sm text-white/70">Available for the lead list and exports.</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Archived
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{archivedFields.length}</p>
          <p className="mt-2 text-sm text-white/70">Kept safely without showing up by default.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="admin-surface-soft rounded-[26px] p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-200/18 bg-violet-300/10 text-violet-100">
              <LayoutTemplate className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Quick-start field templates</p>
              <p className="mt-1 text-sm text-white/70">
                Start with a common pattern, then adjust the details instead of building every field from zero.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {quickStartTemplates.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() =>
                  setNewField({
                    ...createEmptyFieldDraft(),
                    ...template.draft,
                    options: template.draft.options ?? [],
                  })
                }
                className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-semibold text-white">{template.label}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-surface-soft rounded-[26px] p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/80">
              <TableProperties className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Make fields easier to use</p>
              <p className="mt-1 text-sm text-white/70">
                Keep names clear, surface only what matters, and archive instead of deleting.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Use familiar labels your team will recognise instantly.",
              "Only show fields in the table when they help reps work faster.",
              "Archive old fields so inherited lead data stays recoverable.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/70"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CustomFieldEditor
        title="Create field"
        draft={newField}
        onChange={setNewField}
        onSave={() => void createField()}
        isSaving={newSaving}
        message={newMessage}
        saveLabel="Save field"
      />

      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_12%,transparent),color-mix(in_srgb,var(--ld-color-accent)_6%,transparent))] p-4 text-sm text-white/70">
          Keep field names obvious, keys machine-safe, and display rules intentional.
        </div>
        {activeFields.map((field) => {
          const isEditing = editingId === field.id;
          const draft = drafts[field.id] ?? buildFieldDraft(field);
          return (
            <div key={field.id} className="admin-surface-soft rounded-[26px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{field.label}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {crmLabelize(field.type)} • {field.key}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(isEditing ? null : field.id);
                      setDrafts((current) => ({ ...current, [field.id]: buildFieldDraft(field) }));
                    }}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={savingById[field.id]}
                    onClick={() => void toggleArchive(field.id, "archive")}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/16"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Field
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                {field.required ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">Required</span> : null}
                {field.showInForm ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">Form</span> : null}
                {field.showInTable ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">Table</span> : null}
                {field.showInDetails ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">Lead Details</span> : null}
                {field.searchable ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">Searchable</span> : null}
                {field.filterable ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">Filterable</span> : null}
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <CustomFieldEditor
                    title="Edit Field"
                    draft={draft}
                    onChange={(next) => setDrafts((current) => ({ ...current, [field.id]: next }))}
                    onSave={() => void saveField(field.id)}
                    isSaving={Boolean(savingById[field.id])}
                    message={messages[field.id] ?? ""}
                    saveLabel="Save changes"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-white">Archived Fields</p>
            <p className="mt-1 text-sm text-white/70">Restore archived fields when the team needs them again.</p>
          </div>
        </div>
        {archivedFields.length > 0 ? (
          archivedFields.map((field) => (
            <div key={field.id} className="admin-surface-soft rounded-[24px] p-4 opacity-90">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{field.label}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {crmLabelize(field.type)} • {field.key}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingById[field.id]}
                  onClick={() => void toggleArchive(field.id, "restore")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/16"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Field
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="admin-surface-soft rounded-[24px] border border-dashed border-white/12 px-4 py-4 text-sm text-white/70">
            <Check className="mr-2 inline h-4 w-4 text-emerald-200" />
            No archived fields yet.
          </div>
        )}
      </div>
    </div>
  );
}
