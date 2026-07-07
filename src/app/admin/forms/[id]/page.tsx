import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, Eye, EyeOff, FileText, ListChecks, Sparkles, Inbox, ArrowRight, Code } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { CopyButton } from "@/components/admin/CopyButton";
import { cn } from "@/lib/cn";
import { appRoutes } from "@/lib/app-routes";
import {
  getFormById,
  listFormFields,
  listFormRules,
  listFormSubmissions,
} from "@/lib/crm/form-builder-store";

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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] capitalize backdrop-blur-sm",
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

export const dynamic = "force-dynamic";

export default async function FormOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const form = await getFormById(id);
  if (!form) {
    notFound();
  }

  const [fields, rules, submissions] = await Promise.all([
    listFormFields(id),
    listFormRules(id),
    listFormSubmissions(id),
  ]);

  const publicUrl = `/forms/${form.slug}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Fields</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{fields.length}</p>
          <p className="mt-1 text-xs text-white/50">Defined form fields</p>
        </AnimatedCard>
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Rules</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{rules.length}</p>
          <p className="mt-1 text-xs text-white/50">Conditional logic rules</p>
        </AnimatedCard>
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Submissions</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{submissions.length}</p>
          <p className="mt-1 text-xs text-white/50">Total received</p>
        </AnimatedCard>
        <AnimatedCard variant="subtle" className="rounded-[20px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Status</p>
          <div className="mt-2">
            <FormStatusBadge status={form.status} />
          </div>
          <p className="mt-1 text-xs text-white/50">
            {form.isActive ? "Accepting submissions" : "Inactive"}
          </p>
        </AnimatedCard>
      </div>

      <GlassSurface intensity="medium" className="rounded-[24px] p-5 sm:p-6">
        <SectionHeader
          eyebrow="Form details"
          title="Overview"
          description="Core form configuration and public access."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Name</label>
              <p className="mt-1.5 text-sm font-medium text-white">{form.name}</p>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Slug</label>
              <p className="mt-1.5 text-sm font-medium text-white">{form.slug}</p>
            </div>
            {form.description ? (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Description</label>
                <p className="mt-1.5 text-sm leading-6 text-white/70">{form.description}</p>
              </div>
            ) : null}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Created</label>
              <p className="mt-1.5 text-sm text-white/70">
                {new Date(form.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Public URL</label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <Globe className="h-4 w-4 shrink-0 text-white/50" />
                  <span className="min-w-0 truncate text-sm text-white/70">{publicUrl}</span>
                </div>
                <CopyButton text={publicUrl} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Visibility</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]",
                  form.isPublic
                    ? "bg-emerald-500/12 border-emerald-400/25 text-emerald-100"
                    : "bg-white/10 border-white/20 text-white/60"
                )}>
                  {form.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {form.isPublic ? "Public" : "Private"}
                </span>
              </div>
            </div>

            {form.successMessage ? (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Success message</label>
                <p className="mt-1.5 rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/70">
                  {form.successMessage}
                </p>
              </div>
            ) : null}

            {form.redirectUrl ? (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Redirect URL</label>
                <p className="mt-1.5 text-sm text-white/70">{form.redirectUrl}</p>
              </div>
            ) : null}
          </div>
        </div>
      </GlassSurface>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassSurface intensity="soft" className="rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg border border-white/10"
              style={{ backgroundColor: form.primaryColor || "#3b82f6" }}
            />
            <div>
              <p className="text-xs text-white/70">Primary color</p>
              <p className="text-xs font-mono text-white/40">{form.primaryColor || "Default"}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg border border-white/10"
              style={{ backgroundColor: form.accentColor || "#8b5cf6" }}
            />
            <div>
              <p className="text-xs text-white/70">Accent color</p>
              <p className="text-xs font-mono text-white/40">{form.accentColor || "Default"}</p>
            </div>
          </div>
        </GlassSurface>

        <GlassSurface intensity="soft" className="rounded-[24px] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Lead defaults</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Default status</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white">
                {form.defaultStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Default priority</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white">
                {form.defaultPriority}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Default source</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white">
                {form.defaultSource}
              </span>
            </div>
          </div>
        </GlassSurface>
      </div>

      <GlassSurface intensity="medium" className="rounded-[24px] p-5 sm:p-6">
        <SectionHeader
          eyebrow="Quick links"
          title="Navigate"
          description="Jump to a specific section."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href={`${appRoutes.form(id)}/fields`}
            className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Fields</p>
              <p className="text-xs text-white/50">{fields.length} defined</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link
            href={`${appRoutes.form(id)}/rules`}
            className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Rules</p>
              <p className="text-xs text-white/50">{rules.length} configured</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link
            href={`${appRoutes.form(id)}/settings`}
            className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
              <ListChecks className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Settings</p>
              <p className="text-xs text-white/50">Branding and defaults</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link
            href={`${appRoutes.form(id)}/embed`}
            className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
              <Code className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Embed</p>
              <p className="text-xs text-white/50">IFrame and script options</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link
            href={`${appRoutes.form(id)}/submissions`}
            className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
              <Inbox className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Submissions</p>
              <p className="text-xs text-white/50">{submissions.length} received</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" />
          </Link>
        </div>
      </GlassSurface>
    </div>
  );
}
