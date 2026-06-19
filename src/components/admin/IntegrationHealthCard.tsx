import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatCrmDateTime,
  formatIntegrationProviderLabel,
  formatIntegrationStatusLabel,
} from "@/lib/crm/formatters";
import type { IntegrationRecord } from "@/lib/crm/types";

const statusMeta = {
  healthy: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pending_sync: {
    icon: Clock3,
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  failed: {
    icon: AlertTriangle,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  not_configured: {
    icon: Activity,
    className: "border-slate-200 bg-white text-slate-600",
  },
  disabled: {
    icon: Activity,
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
} as const;

export function IntegrationHealthCard({
  integration,
  href,
}: {
  integration: IntegrationRecord;
  href?: string;
}) {
  const meta = statusMeta[integration.status];
  const Icon = meta.icon;

  const card = (
    <article className="admin-surface-soft rounded-2xl p-4 transition hover:border-slate-300 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{formatIntegrationProviderLabel(integration.provider)}</p>
          <h3 className="mt-1.5 text-base font-semibold text-slate-950">
            {integration.accountName || "Awaiting account name"}
          </h3>
        </div>
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border", meta.className)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <p>Status: <span className="text-slate-800">{formatIntegrationStatusLabel(integration.status)}</span></p>
        <p>Recent sync: <span className="text-slate-800">{formatCrmDateTime(integration.lastSyncAt)}</span></p>
        <p className="line-clamp-2">Latest note: <span className="text-slate-800">{integration.lastError || "Everything looks clear."}</span></p>
      </div>
    </article>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
