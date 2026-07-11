import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Inbox } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { appRoutes } from "@/lib/app-routes";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import {
  getFormResourceCounts,
  listFormFields,
  listFormSubmissions,
} from "@/lib/crm/form-builder-store";
import {
  decodeFormSubmissionCursor,
  encodeFormSubmissionCursor,
} from "@/lib/crm/form-submission-pagination";
import type { FormSubmissionRow } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function formatSubmissionValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat().format(value);
  }

  if (typeof value === "string") {
    return value.trim() || "Not provided";
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => formatSubmissionValue(item))
      .filter((item) => item !== "Not provided");
    return normalized.length > 0 ? normalized.join(", ") : "Not provided";
  }

  if (typeof value === "object") {
    return "Saved";
  }

  return String(value);
}

function buildSubmissionHighlights(
  submission: FormSubmissionRow,
  fieldLabelMap: Map<string, string>,
) {
  return Object.entries(submission.data)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([fieldId, value]) => ({
      fieldId,
      label: fieldLabelMap.get(fieldId) ?? "Captured field",
      value: formatSubmissionValue(value),
    }));
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const isProcessed = status === "processed";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        isProcessed
          ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-100"
          : "border-amber-400/25 bg-amber-500/12 text-amber-100",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isProcessed ? "bg-emerald-300" : "bg-amber-300",
        ].join(" ")}
      />
      {status}
    </span>
  );
}

export default async function FormSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const rawCursor = Array.isArray(query.cursor) ? query.cursor[0] : query.cursor;
  const cursor = decodeFormSubmissionCursor(rawCursor);
  const rawDirection = Array.isArray(query.direction) ? query.direction[0] : query.direction;
  const direction = rawDirection === "prev" ? "prev" : "next";
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  const currentPage = cursor && Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [submissions, fields, countsByForm] = await Promise.all([
    listFormSubmissions(id, {
      limit: PAGE_SIZE,
      cursor: cursor ? rawCursor : undefined,
      cursorDirection: direction,
    }),
    listFormFields(id),
    getFormResourceCounts([id]),
  ]);
  const totalSubmissions = countsByForm.get(id)?.submissionCount ?? 0;
  const rangeStart = totalSubmissions === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalSubmissions, rangeStart + submissions.length - 1);
  const previousCursor = submissions[0]
    ? encodeFormSubmissionCursor({
        id: submissions[0].id,
        createdAt: submissions[0].createdAt.toISOString(),
      })
    : null;
  const nextCursor = submissions.at(-1)
    ? encodeFormSubmissionCursor({
        id: submissions.at(-1)!.id,
        createdAt: submissions.at(-1)!.createdAt.toISOString(),
      })
    : null;
  const submissionsPath = `${appRoutes.form(id)}/submissions`;

  const fieldLabelMap = new Map(fields.map((field) => [field.id, field.label]));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Submissions"
        title={`${totalSubmissions} submission${totalSubmissions === 1 ? "" : "s"}`}
        description="Recent form completions, routing outcome, and the lead created from each submission."
      />

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Submissions will appear here as soon as this form starts capturing leads."
          icon={Inbox}
        />
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => {
            const highlights = buildSubmissionHighlights(submission, fieldLabelMap);
            const visibleHighlights = highlights.slice(0, 6);
            const remainingHighlights = Math.max(highlights.length - visibleHighlights.length, 0);
            const leadHref = submission.createdLeadId ?? submission.leadId;

            return (
              <GlassSurface
                key={submission.id}
                intensity="soft"
                className="rounded-[24px] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmissionStatusBadge status={submission.status} />
                      {leadHref ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-100">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Lead created
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Submitted {formatCrmDateTime(submission.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        Ref {submission.id.slice(0, 8)} • {highlights.length} field
                        {highlights.length === 1 ? "" : "s"} captured
                        {submission.appliedRules?.length
                          ? ` • ${submission.appliedRules.length} rule${submission.appliedRules.length === 1 ? "" : "s"} applied`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {leadHref ? (
                    <Link href={appRoutes.lead(leadHref)} className="shrink-0">
                      <SmoothButton
                        variant="ghost"
                        size="sm"
                        icon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        View lead
                      </SmoothButton>
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleHighlights.map((highlight) => (
                    <div
                      key={`${submission.id}-${highlight.fieldId}`}
                      className="rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/52">
                        {highlight.label}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/82">
                        {highlight.value}
                      </p>
                    </div>
                  ))}
                </div>

                {remainingHighlights > 0 ? (
                  <p className="mt-4 text-xs font-medium text-white/48">
                    +{remainingHighlights} more captured field
                    {remainingHighlights === 1 ? "" : "s"} on this submission
                  </p>
                ) : null}
              </GlassSurface>
            );
          })}

          <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-white/55">
              Showing {rangeStart}-{rangeEnd} of {totalSubmissions}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && previousCursor ? (
                <Link
                  href={`${submissionsPath}?cursor=${encodeURIComponent(previousCursor)}&direction=prev&page=${currentPage - 1}`}
                  className="admin-button-secondary inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Newer
                </Link>
              ) : null}
              {rangeEnd < totalSubmissions && nextCursor ? (
                <Link
                  href={`${submissionsPath}?cursor=${encodeURIComponent(nextCursor)}&direction=next&page=${currentPage + 1}`}
                  className="admin-button-secondary inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium"
                >
                  Older
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
