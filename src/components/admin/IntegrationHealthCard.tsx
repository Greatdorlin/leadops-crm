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
    className: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
  },
  pending_sync: {
    icon: Clock3,
    className: "border-amber-300/20 bg-amber-400/[0.06] text-amber-100",
  },
  failed: {
    icon: AlertTriangle,
    className: "border-rose-300/20 bg-rose-500/10 text-rose-100",
  },
  not_configured: {
    icon: Activity,
    className: "border-white/10 bg-white/[0.08] text-white/70",
  },
  disabled: {
    icon: Activity,
    className: "border-white/10 bg-white/[0.08] text-white/70",
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
  const defaultNote = integration.status === "healthy"
    ? "Provider access was verified and no issue is recorded."
    : integration.status === "not_configured"
      ? "Complete setup before using this connection."
      : integration.status === "disabled"
        ? "This connection is disabled."
        : integration.status === "pending_sync"
          ? "Server setup is present. Verify provider access before going live."
          : "No additional detail recorded.";
  const statusLabel =
    integration.status === "pending_sync"
      ? "Ready to verify"
      : formatIntegrationStatusLabel(integration.status);

  const card = (
    <article className="admin-surface-soft rounded-2xl p-4 transition hover:border-white/15 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/70">{formatIntegrationProviderLabel(integration.provider)}</p>
          <h3 className="mt-1.5 text-base font-semibold text-white">
            {integration.accountName || "Awaiting account name"}
          </h3>
        </div>
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border", meta.className)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-white/70">
        <p>Status: <span className="text-white/90">{statusLabel}</span></p>
        <p>Recent sync: <span className="text-white/90">{formatCrmDateTime(integration.lastSyncAt)}</span></p>
        <p className="line-clamp-2">Latest note: <span className="text-white/90">{integration.lastError || defaultNote}</span></p>
      </div>
    </article>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
