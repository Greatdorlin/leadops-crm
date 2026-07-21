"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Archive,
  RotateCcw,
  Edit,
  FileText,
  ListChecks,
  Inbox,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { cn } from "@/lib/cn";
import { appRoutes } from "@/lib/app-routes";
import type { FormRow } from "@/lib/db/schema";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
import { formatCrmDate } from "@/lib/crm/formatters";
import type { CrmUserRole } from "@/lib/crm/types";
import { canManageForms } from "@/lib/crm/authz";
import { WorkspaceImpactConfirmation } from "@/components/admin/WorkspaceImpactConfirmation";

interface FormWithCounts extends FormRow {
  fieldCount: number;
  submissionCount: number;
}

export function buildFormCopySlug(sourceSlug: string, existingSlugs: readonly string[]) {
  const root = sourceSlug.replace(/-copy(?:-\d+)?$/, "").slice(0, 113).replace(/-+$/, "") || "form";
  const used = new Set(existingSlugs);
  let candidate = `${root}-copy`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${root.slice(0, 116 - String(suffix).length).replace(/-+$/, "")}-copy-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function FormStatusBadge({ status }: { status: string }) {
  const style =
    status === "active"
      ? { bg: "bg-emerald-500/12", border: "border-emerald-400/25", text: "text-emerald-100", dot: "bg-emerald-400" }
      : status === "draft"
      ? { bg: "bg-amber-500/12", border: "border-amber-400/25", text: "text-amber-100", dot: "bg-amber-400" }
      : { bg: "bg-slate-500/12", border: "border-slate-400/25", text: "text-slate-100", dot: "bg-slate-400" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] capitalize backdrop-blur-sm",
        style.bg,
        style.border,
        style.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {status}
    </span>
  );
}

function FormCard({
  form,
  onStatusChange,
  onDuplicate,
  onDelete,
  duplicateSlug,
  canManage,
  demoMode,
}: {
  form: FormWithCounts;
  onStatusChange: (id: string, status: "draft" | "archived") => void;
  onDuplicate: (source: FormWithCounts, duplicate: FormRow) => void;
  onDelete: (id: string) => void;
  duplicateSlug: string;
  canManage: boolean;
  demoMode: boolean;
}) {
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setArchiving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "We couldn't archive this form.");
      onStatusChange(form.id, "archived");
    } catch (error) {
      setError(error instanceof Error ? error.message : "We couldn't archive this form.");
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft", isActive: false }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "We couldn't restore this form.");
      onStatusChange(form.id, "draft");
    } catch (error) {
      setError(error instanceof Error ? error.message : "We couldn't restore this form.");
    } finally {
      setRestoring(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    setError(null);
    try {
      if (demoMode) {
        onDuplicate(form, { ...form, id: crypto.randomUUID(), name: `${form.name} (Copy)`, slug: duplicateSlug, status: "draft", isActive: false, createdAt: new Date(), updatedAt: new Date() });
        return;
      }
      const res = await fetch(`/api/admin/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplicateFromId: form.id,
          name: `${form.name} (Copy)`,
          slug: duplicateSlug,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string; form?: FormRow } | null;
      if (!res.ok) throw new Error(payload?.error ?? "We couldn't duplicate this form.");
      if (!payload?.form) throw new Error("The duplicate was created but could not be displayed.");
      onDuplicate(form, payload.form);
    } catch (error) {
      setError(error instanceof Error ? error.message : "We couldn't duplicate this form.");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      if (!demoMode) {
        const res = await fetch(`/api/admin/forms/${form.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "DELETE FORM" }),
        });
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(payload?.error ?? "We couldn't delete this form.");
      }
      onDelete(form.id);
      setDeleteOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't delete this form.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatedCard variant="default" className="rounded-[24px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-white">{form.name}</h3>
            <FormStatusBadge status={form.status} />
          </div>
          <p className="mt-1 text-xs font-mono text-white/40">{form.slug}</p>
        </div>
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.06] text-white/70">
          <FileText className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-white/40" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Fields</span>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">{form.fieldCount}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5 text-white/40" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Submissions</span>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">{form.submissionCount}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/50">
        Created {formatCrmDate(form.createdAt)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={appRoutes.form(form.id)}
          className="admin-button-primary inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Link>
        {form.isPublic && form.status === "active" && !demoMode ? (
          <Link
            href={`/forms/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-button-secondary inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Link>
        ) : null}
        {canManage ? (
          <>
            <SmoothButton
              variant="ghost"
              size="sm"
              loading={duplicating}
              onClick={handleDuplicate}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </SmoothButton>
            {form.status !== "archived" ? (
              <SmoothButton
                variant="ghost"
                size="sm"
                loading={archiving}
                onClick={handleArchive}
                className="h-9 gap-1.5 rounded-xl px-3 text-xs"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </SmoothButton>
            ) : (
              <>
                <SmoothButton
                  variant="ghost"
                  size="sm"
                  loading={restoring}
                  onClick={handleRestore}
                  className="h-9 gap-1.5 rounded-xl px-3 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore as draft
                </SmoothButton>
                <SmoothButton variant="danger" size="sm" onClick={() => setDeleteOpen(true)} className="h-9 gap-1.5 rounded-xl px-3 text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </SmoothButton>
              </>
            )}
          </>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-xs font-medium text-rose-200">{error}</p> : null}
      <WorkspaceImpactConfirmation
        open={deleteOpen}
        title="Delete form permanently?"
        description={`This permanently deletes ${form.name}, its fields, logic, and submission history. Leads already created by the form remain in Leads Desk.`}
        confirmationPhrase="DELETE FORM"
        actionLabel="Delete form"
        busy={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </AnimatedCard>
  );
}

export function FormListGrid({
  initialForms,
  accessLevel,
  role,
  permissions,
  demoMode = false,
}: {
  initialForms: FormWithCounts[];
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  permissions?: readonly PermissionKey[];
  demoMode?: boolean;
}) {
  const [forms, setForms] = useState<FormWithCounts[]>(initialForms);
  const canManage = canManageForms({ accessLevel, role, permissions });

  function handleStatusChange(id: string, status: "draft" | "archived") {
    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, status, isActive: false, isPublic: status === "archived" ? false : f.isPublic }
          : f,
      ),
    );
  }

  function handleDuplicate(source: FormWithCounts, duplicate: FormRow) {
    setForms((current) => [{ ...duplicate, fieldCount: source.fieldCount, submissionCount: 0 }, ...current]);
  }

  function handleDelete(id: string) {
    setForms((current) => current.filter((form) => form.id !== id));
  }

  const activeForms = forms.filter((f) => f.status === "active");
  const draftForms = forms.filter((f) => f.status === "draft");
  const archivedForms = forms.filter((f) => f.status === "archived");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Active forms</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{activeForms.length}</p>
          <p className="mt-1 text-xs text-white/50">Accepting submissions</p>
        </AnimatedCard>
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Draft forms</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{draftForms.length}</p>
          <p className="mt-1 text-xs text-white/50">Not yet published</p>
        </AnimatedCard>
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Archived</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{archivedForms.length}</p>
          <p className="mt-1 text-xs text-white/50">No longer active</p>
        </AnimatedCard>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="break-words font-[family:var(--font-heading)] text-[1.55rem] leading-[1.1] tracking-[-0.045em] text-white">
            All forms
          </h2>
          <p className="mt-1 text-sm text-white/70">Manage forms, fields, and submission rules.</p>
        </div>
        {canManage ? (
          <Link
            href={appRoutes.formsNew}
            className="admin-button-primary inline-flex h-11 shrink-0 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
          >
            Create new form
          </Link>
        ) : null}
      </div>

      {forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Create your first form to start capturing leads."
          icon={FileText}
          action={
            canManage ? (
              <Link
                href={appRoutes.formsNew}
                className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
              >
                Create new form
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onStatusChange={handleStatusChange}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              duplicateSlug={buildFormCopySlug(form.slug, forms.map((item) => item.slug))}
              canManage={canManage}
              demoMode={demoMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
