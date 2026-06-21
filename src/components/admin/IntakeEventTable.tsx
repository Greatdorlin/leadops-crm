import Link from "next/link";
import type { IntakeEventAdminRow } from "@/lib/crm/intake-runtime";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { EmptyState } from "./EmptyState";

function statusTone(status: IntakeEventAdminRow["status"]) {
  switch (status) {
    case "lead_created":
      return "border-emerald-300/24 bg-emerald-400/10 text-emerald-100";
    case "failed":
      return "border-rose-300/24 bg-rose-400/10 text-rose-100";
    case "mapped":
      return "border-amber-300/24 bg-amber-400/10 text-amber-100";
    case "ignored":
      return "border-white/10 bg-white/[0.045] text-white/60";
    case "received":
    default:
      return "border-cyan-300/24 bg-cyan-400/10 text-cyan-100";
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
          className="admin-surface-soft rounded-[24px] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(event.status)}`}
                >
                  {event.status.replace(/_/g, " ")}
                </span>
                <p className="text-sm text-white/54">{event.sourceName || "Unknown source"}</p>
              </div>
              <p className="text-sm text-white/58">{formatCrmDateTime(event.createdAt)}</p>
              {event.errorMessage ? (
                <p className="text-sm text-rose-100">{event.errorMessage}</p>
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
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-sm text-white/72 [overflow-wrap:anywhere]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {showRawPayload && event.rawPayload ? (
            <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-white/70">
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
