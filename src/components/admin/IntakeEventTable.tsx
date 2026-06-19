import Link from "next/link";
import type { IntakeEventAdminRow } from "@/lib/crm/intake-runtime";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { EmptyState } from "./EmptyState";

function statusTone(status: IntakeEventAdminRow["status"]) {
  switch (status) {
    case "lead_created":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "mapped":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ignored":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "received":
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

export function IntakeEventTable({
  events,
  showRawPayload,
}: {
  events: IntakeEventAdminRow[];
  showRawPayload: boolean;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No intake events yet"
        description="Webhook deliveries and intake failures will appear here once a form source starts sending leads."
      />
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article
          key={event.id}
          className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,255,0.94)_100%)] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(event.status)}`}
                >
                  {event.status.replace(/_/g, " ")}
                </span>
                <p className="text-sm text-slate-500">{event.sourceName || "Unknown source"}</p>
              </div>
              <p className="text-sm text-slate-600">{formatCrmDateTime(event.createdAt)}</p>
              {event.errorMessage ? (
                <p className="text-sm text-rose-700">{event.errorMessage}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {event.leadId ? (
                <Link
                  href={`/admin/leads/${event.leadId}`}
                  className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                >
                  {event.leadName ? `Open ${event.leadName}` : "Open lead"}
                </Link>
              ) : null}
            </div>
          </div>

          {event.normalizedSummary.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {event.normalizedSummary.map((item) => (
                <div
                  key={`${event.id}-${item.label}`}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-800 [overflow-wrap:anywhere]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {showRawPayload && event.rawPayload ? (
            <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Advanced payload
              </summary>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(event.rawPayload, null, 2)}
              </pre>
            </details>
          ) : null}
        </article>
      ))}
    </div>
  );
}
