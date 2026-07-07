"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Trash2,
  Archive,
  Edit,
  FileText,
  ListChecks,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { cn } from "@/lib/cn";
import { appRoutes } from "@/lib/app-routes";
import type { FormRow } from "@/lib/db/schema";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { CrmUserRole } from "@/lib/crm/types";
import { canManageForms } from "@/lib/crm/authz";

interface FormWithCounts extends FormRow {
  fieldCount: number;
  submissionCount: number;
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
  onDelete,
  onArchive,
  onDuplicate,
  canManage,
}: {
  form: FormWithCounts;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  canManage: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, { method: "DELETE" });
      if (res.ok) onDelete(form.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (res.ok) onArchive(form.id);
    } catch (e) {
      console.error(e);
    } finally {
      setArchiving(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.name} (Copy)`,
          slug: `${form.slug}-copy-${Date.now()}`,
          description: form.description,
        }),
      });
      if (res.ok) onDuplicate(form.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDuplicating(false);
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
        Created{" "}
        {new Date(form.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={appRoutes.form(form.id)}
          className="admin-button-primary inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Link>
        {form.isPublic && form.status === "active" ? (
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
            ) : null}
            <SmoothButton
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </SmoothButton>
          </>
        ) : null}
      </div>
    </AnimatedCard>
  );
}

export function FormListGrid({
  initialForms,
  accessLevel,
  role,
}: {
  initialForms: FormWithCounts[];
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
}) {
  const [forms, setForms] = useState<FormWithCounts[]>(initialForms);
  const canManage = canManageForms({ accessLevel, role });

  function handleDelete(id: string) {
    setForms((prev) => prev.filter((f) => f.id !== id));
  }

  function handleArchive(id: string) {
    setForms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "archived" } : f))
    );
  }

  function handleDuplicate() {
    window.location.reload();
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
          <h2 className="font-[family:var(--font-heading)] text-[1.55rem] leading-[1.02] tracking-[-0.05em] text-white">
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
              onDelete={handleDelete}
              onArchive={handleArchive}
              onDuplicate={handleDuplicate}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
