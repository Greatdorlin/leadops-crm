"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { GradientText } from "@/components/admin/ui/GradientText";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  GripVertical,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Save,
  AlertCircle,
  Type,
  Mail,
  Phone,
  Hash,
  CheckSquare,
  CircleDot,
  AlignLeft,
  Calendar,
  FileUp,
  ChevronDown,
} from "lucide-react";

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "checkbox"
  | "radio"
  | "textarea"
  | "date"
  | "file";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface FormFieldShowWhen {
  fieldId: string;
  operator: string;
  value: string;
}

export interface FormFieldData {
  id: string;
  formId: string;
  fieldType: FieldType;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  isVisible: boolean;
  order: number;
  options?: FormFieldOption[] | null;
  validationRules?: FormFieldValidation | null;
  mapsToLeadField?: string | null;
  showWhen?: FormFieldShowWhen | null;
  defaultValue?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const FIELD_TYPE_ICONS: Record<FieldType, typeof Type> = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  select: ChevronDown,
  checkbox: CheckSquare,
  radio: CircleDot,
  textarea: AlignLeft,
  date: Calendar,
  file: FileUp,
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Select",
  checkbox: "Checkbox",
  radio: "Radio",
  textarea: "Textarea",
  date: "Date",
  file: "File",
};

const LEAD_FIELD_OPTIONS = [
  { value: "", label: "— Do not map —" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "whatsappNumber", label: "WhatsApp Number" },
  { value: "companyName", label: "Company Name" },
  { value: "jobTitle", label: "Job Title" },
  { value: "region", label: "Region" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "address", label: "Address" },
  { value: "postalCode", label: "Postal Code" },
];

interface FormFieldEditorProps {
  formId: string;
  initialFields?: unknown[];
  canEdit?: boolean;
}

function FieldTypeIcon({ type }: { type: FieldType }) {
  const Icon = FIELD_TYPE_ICONS[type] ?? Type;
  return <Icon className="h-4 w-4" />;
}

function getFieldSummary(field: FormFieldData) {
  const parts: string[] = [FIELD_TYPE_LABELS[field.fieldType]];
  if (field.isRequired) parts.push("required");
  if (field.mapsToLeadField) parts.push(`→ ${field.mapsToLeadField}`);
  return parts.join(" · ");
}

export function FormFieldEditor({ formId, initialFields = [], canEdit = true }: FormFieldEditorProps) {
  const [fields, setFields] = useState<FormFieldData[]>(
    [...(initialFields as FormFieldData[])].sort((a, b) => a.order - b.order)
  );
  const [editingField, setEditingField] = useState<FormFieldData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraft = useCallback((): FormFieldData => {
    const maxOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.order)) : -1;
    return {
      id: `temp-${Date.now()}`,
      formId,
      fieldType: "text",
      label: "",
      placeholder: "",
      helpText: "",
      isRequired: false,
      isVisible: true,
      order: maxOrder + 1,
      options: null,
      validationRules: null,
      mapsToLeadField: null,
      showWhen: null,
      defaultValue: null,
    };
  }, [formId, fields]);

  const handleMove = useCallback(
    async (fieldId: string, direction: "up" | "down") => {
      const idx = fields.findIndex((f) => f.id === fieldId);
      if (idx === -1) return;
      if (direction === "up" && idx === 0) return;
      if (direction === "down" && idx === fields.length - 1) return;

      const newFields = [...fields];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];

      const reordered = newFields.map((f, i) => ({ ...f, order: i }));
      setFields(reordered);

      try {
        const res = await fetch(`/api/admin/forms/${formId}/fields`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
        });
        if (!res.ok) throw new Error("Failed to reorder fields");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed");
      }
    },
    [fields, formId]
  );

  const handleDragStart = (fieldId: string) => {
    setDraggingId(fieldId);
  };

  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== fieldId) {
      setDragOverId(fieldId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIdx = fields.findIndex((f) => f.id === draggingId);
    const toIdx = fields.findIndex((f) => f.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(fromIdx, 1);
    newFields.splice(toIdx, 0, moved);

    const reordered = newFields.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);
    setDraggingId(null);
    setDragOverId(null);

    try {
      const res = await fetch(`/api/admin/forms/${formId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
      });
      if (!res.ok) throw new Error("Failed to reorder fields");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm("Delete this field? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/forms/${formId}/fields/${fieldId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete field");
      setFields(fields.filter((f) => f.id !== fieldId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleSave = async (field: FormFieldData) => {
    setSaving(true);
    setError(null);
    try {
      const isNew = field.id.startsWith("temp-");
      const payload = {
        ...field,
        options: ["select", "checkbox", "radio"].includes(field.fieldType) ? (field.options ?? []) : null,
        validationRules: field.validationRules ?? null,
        showWhen: field.showWhen ? (field.showWhen as unknown as Record<string, unknown>) : null,
      };

      if (isNew) {
        const res = await fetch(`/api/admin/forms/${formId}/fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create field");
        const data = await res.json();
        setFields([...fields, data.field]);
      } else {
        const res = await fetch(`/api/admin/forms/${formId}/fields/${field.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update field");
        const data = await res.json();
        setFields(fields.map((f) => (f.id === field.id ? data.field : f)));
      }
      setEditingField(null);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (field: FormFieldData) => {
    setEditingField({ ...field });
    setIsCreating(false);
    setError(null);
  };

  const startCreating = () => {
    setEditingField(createDraft());
    setIsCreating(true);
    setError(null);
  };

  const closeEditor = () => {
    setEditingField(null);
    setIsCreating(false);
    setError(null);
  };

  const updateDraft = (updates: Partial<FormFieldData>) => {
    setEditingField((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const addOption = () => {
    if (!editingField) return;
    const current = editingField.options ?? [];
    updateDraft({
      options: [...current, { label: `Option ${current.length + 1}`, value: `option_${current.length + 1}` }],
    });
  };

  const removeOption = (idx: number) => {
    if (!editingField) return;
    const current = editingField.options ?? [];
    updateDraft({ options: current.filter((_, i) => i !== idx) });
  };

  const updateOption = (idx: number, label: string, value: string) => {
    if (!editingField) return;
    const current = editingField.options ?? [];
    const next = [...current];
    next[idx] = { label, value };
    updateDraft({ options: next });
  };

  const updateValidation = (updates: Partial<FormFieldValidation>) => {
    if (!editingField) return;
    updateDraft({
      validationRules: { ...(editingField.validationRules ?? {}), ...updates },
    });
  };

  const hasOptions = editingField && ["select", "checkbox", "radio"].includes(editingField.fieldType);
  const hasValidation = editingField && ["text", "email", "phone", "textarea"].includes(editingField.fieldType);
  const hasNumericValidation = editingField && editingField.fieldType === "number";

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Form Fields"
        description="Build your form by adding, editing, and reordering fields."
        variant="compact"
        actions={
          canEdit ? (
            <SmoothButton size="sm" icon={<Plus className="h-4 w-4" />} onClick={startCreating}>
              Add Field
            </SmoothButton>
          ) : undefined
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-[16px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        {fields.length === 0 ? (
          <GlassSurface intensity="soft" className="py-12 text-center">
            <p className="text-sm text-white/70">
              {canEdit ? 'No fields yet. Click "Add Field" to get started.' : 'No fields defined for this form.'}
            </p>
          </GlassSurface>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              draggable={canEdit}
              onDragStart={() => canEdit && handleDragStart(field.id)}
              onDragOver={(e) => handleDragOver(e, field.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, field.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-[18px] border px-4 py-3 transition-all duration-200",
                "border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.07]",
                dragOverId === field.id && "border-[var(--ld-color-primary)]/40 bg-[var(--ld-color-primary)]/5",
                draggingId === field.id && "opacity-50"
              )}
            >
              {canEdit && (
                <div className="cursor-grab text-white/30 hover:text-white/60 active:cursor-grabbing">
                  <GripVertical className="h-5 w-5" />
                </div>
              )}

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06] text-white/70">
                <FieldTypeIcon type={field.fieldType} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">{field.label || "Untitled Field"}</span>
                  {field.isRequired && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Required</span>
                  )}
                  {!field.isVisible && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Hidden</span>
                  )}
                </div>
                <p className="truncate text-xs text-white/50">{getFieldSummary(field)}</p>
              </div>

              {canEdit && (
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100">
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={<ArrowUp className="h-3.5 w-3.5" />}
                    onClick={() => handleMove(field.id, "up")}
                    className="h-8 w-8 px-0"
                    disabled={fields.indexOf(field) === 0}
                  >
                    <span className="sr-only">Move up</span>
                  </SmoothButton>
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={<ArrowDown className="h-3.5 w-3.5" />}
                    onClick={() => handleMove(field.id, "down")}
                    className="h-8 w-8 px-0"
                    disabled={fields.indexOf(field) === fields.length - 1}
                  >
                    <span className="sr-only">Move down</span>
                  </SmoothButton>
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => openEditor(field)}
                    className="h-8 w-8 px-0"
                  >
                    <span className="sr-only">Edit</span>
                  </SmoothButton>
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleDelete(field.id)}
                    className="h-8 w-8 px-0 text-red-400 hover:text-red-300"
                  >
                    <span className="sr-only">Delete</span>
                  </SmoothButton>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <SmoothButton
          variant="secondary"
          size="md"
          icon={<Plus className="h-4 w-4" />}
          onClick={startCreating}
          className="w-full sm:w-auto"
        >
          Add Another Field
        </SmoothButton>
      )}

      {editingField && canEdit && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditor} />
          <GlassSurface
            intensity="strong"
            className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-[28px] border border-white/15 sm:max-w-lg sm:rounded-[28px]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">
                <GradientText>{isCreating ? "New Field" : "Edit Field"}</GradientText>
              </h3>
              <button
                onClick={closeEditor}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">Field Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => {
                      const Icon = FIELD_TYPE_ICONS[type];
                      const active = editingField.fieldType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => updateDraft({ fieldType: type })}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-[14px] border px-2 py-2.5 text-xs font-medium transition-all",
                            active
                              ? "border-[var(--ld-color-primary)]/40 bg-[var(--ld-color-primary)]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                              : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/80"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{FIELD_TYPE_LABELS[type]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">Label</label>
                  <input
                    type="text"
                    value={editingField.label}
                    onChange={(e) => updateDraft({ label: e.target.value })}
                    placeholder="e.g., Full Name"
                    className="admin-input w-full"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/90">Placeholder</label>
                    <input
                      type="text"
                      value={editingField.placeholder ?? ""}
                      onChange={(e) => updateDraft({ placeholder: e.target.value || null })}
                      placeholder="e.g., Enter your name"
                      className="admin-input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/90">Help Text</label>
                    <input
                      type="text"
                      value={editingField.helpText ?? ""}
                      onChange={(e) => updateDraft({ helpText: e.target.value || null })}
                      placeholder="Short hint for the user"
                      className="admin-input w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={editingField.isRequired}
                      onChange={(e) => updateDraft({ isRequired: e.target.checked })}
                      className="h-4 w-4 accent-[var(--ld-color-primary)]"
                    />
                    <span className="text-sm text-white/90">Required</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={editingField.isVisible}
                      onChange={(e) => updateDraft({ isVisible: e.target.checked })}
                      className="h-4 w-4 accent-[var(--ld-color-primary)]"
                    />
                    <span className="text-sm text-white/90">Visible</span>
                  </label>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">Default Value</label>
                  <input
                    type="text"
                    value={editingField.defaultValue ?? ""}
                    onChange={(e) => updateDraft({ defaultValue: e.target.value || null })}
                    placeholder="Pre-fill value (optional)"
                    className="admin-input w-full"
                  />
                </div>

                {hasOptions && (
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white/90">Options</span>
                      <SmoothButton size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={addOption}>
                        Add
                      </SmoothButton>
                    </div>
                    <div className="space-y-2">
                      {(editingField.options ?? []).length === 0 ? (
                        <p className="text-xs text-white/40">No options yet. Click Add to create one.</p>
                      ) : (
                        (editingField.options ?? []).map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => updateOption(idx, e.target.value, opt.value)}
                              placeholder="Label"
                              className="admin-input flex-1 text-sm"
                            />
                            <input
                              type="text"
                              value={opt.value}
                              onChange={(e) => updateOption(idx, opt.label, e.target.value)}
                              placeholder="Value"
                              className="admin-input flex-1 text-sm"
                            />
                            <SmoothButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => removeOption(idx)}
                              className="h-8 w-8 shrink-0 px-0 text-red-400 hover:text-red-300"
                            >
                              <span className="sr-only">Remove option</span>
                            </SmoothButton>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {(hasValidation || hasNumericValidation) && (
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                    <span className="mb-3 block text-sm font-semibold text-white/90">Validation</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {hasValidation && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs text-white/70">Min Length</label>
                            <input
                              type="number"
                              value={editingField.validationRules?.minLength ?? ""}
                              onChange={(e) =>
                                updateValidation({
                                  minLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                })
                              }
                              placeholder="0"
                              className="admin-input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-white/70">Max Length</label>
                            <input
                              type="number"
                              value={editingField.validationRules?.maxLength ?? ""}
                              onChange={(e) =>
                                updateValidation({
                                  maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                })
                              }
                              placeholder="∞"
                              className="admin-input w-full text-sm"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-white/70">Pattern (Regex)</label>
                            <input
                              type="text"
                              value={editingField.validationRules?.pattern ?? ""}
                              onChange={(e) => updateValidation({ pattern: e.target.value || undefined })}
                              placeholder="e.g., ^[A-Z]{2}$"
                              className="admin-input w-full text-sm"
                            />
                          </div>
                        </>
                      )}
                      {hasNumericValidation && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs text-white/70">Min</label>
                            <input
                              type="number"
                              value={editingField.validationRules?.min ?? ""}
                              onChange={(e) =>
                                updateValidation({
                                  min: e.target.value ? parseFloat(e.target.value) : undefined,
                                })
                              }
                              placeholder="0"
                              className="admin-input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-white/70">Max</label>
                            <input
                              type="number"
                              value={editingField.validationRules?.max ?? ""}
                              onChange={(e) =>
                                updateValidation({
                                  max: e.target.value ? parseFloat(e.target.value) : undefined,
                                })
                              }
                              placeholder="∞"
                              className="admin-input w-full text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">Map to Lead Field</label>
                  <AdminSelect
                    value={editingField.mapsToLeadField ?? ""}
                    onChange={(e) => updateDraft({ mapsToLeadField: e.target.value || null })}
                  >
                    {LEAD_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </AdminSelect>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <span className="mb-3 block text-sm font-semibold text-white/90">Conditional Visibility</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-white/70">Show when field</label>
                      <AdminSelect
                        value={editingField.showWhen?.fieldId ?? ""}
                        onChange={(e) =>
                          updateDraft({
                            showWhen: e.target.value
                              ? { fieldId: e.target.value, operator: "equals", value: editingField.showWhen?.value ?? "" }
                              : null,
                          })
                        }
                      >
                        <option value="">— Always show —</option>
                        {fields
                          .filter((f) => f.id !== editingField.id && f.fieldType !== "file")
                          .map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label || "Untitled Field"}
                            </option>
                          ))}
                      </AdminSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/70">Equals</label>
                      <input
                        type="text"
                        value={editingField.showWhen?.value ?? ""}
                        onChange={(e) =>
                          updateDraft({
                            showWhen: editingField.showWhen
                              ? { ...editingField.showWhen, value: e.target.value }
                              : null,
                          })
                        }
                        placeholder="Value to match"
                        className="admin-input w-full text-sm"
                        disabled={!editingField.showWhen}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
              <SmoothButton variant="ghost" onClick={closeEditor}>
                Cancel
              </SmoothButton>
              <SmoothButton
                variant="primary"
                icon={<Save className="h-4 w-4" />}
                loading={saving}
                disabled={!editingField.label.trim()}
                onClick={() => handleSave(editingField)}
              >
                {isCreating ? "Create Field" : "Save Changes"}
              </SmoothButton>
            </div>
          </GlassSurface>
        </div>
      )}
    </div>
  );
}
