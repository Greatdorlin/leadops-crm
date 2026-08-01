import Link from "next/link";
import { ArrowUpRight, Clock3, FileInput, PlugZap, ShieldCheck } from "lucide-react";
import {
  connectorRegistry,
  type ConnectorAvailability,
  type ConnectorCategory,
} from "@/lib/integrations/connector-registry";
import { getConnectorSetupState } from "@/lib/integrations/connector-runtime";

const categoryLabels: Record<ConnectorCategory, string> = {
  lead_capture: "Lead capture",
  crm_migration: "CRM migration",
  email_marketing: "Email marketing",
  communication: "Communication",
  automation: "Automation",
  reporting: "Reporting",
};

const availabilityMeta: Record<ConnectorAvailability, { label: string; className: string }> = {
  available: { label: "Setup available", className: "border-emerald-300/22 bg-emerald-400/10 text-emerald-100" },
  mapped_import: { label: "Mapped import", className: "border-cyan-300/22 bg-cyan-400/10 text-cyan-100" },
  adapter_ready: { label: "Adapter ready", className: "border-amber-300/22 bg-amber-400/10 text-amber-100" },
  planned: { label: "Planned", className: "border-white/12 bg-white/[0.06] text-white/64" },
};

export function ConnectorCatalog() {
  const categories = Object.keys(categoryLabels) as ConnectorCategory[];

  return (
    <div className="space-y-5">
      {categories.map((category) => {
        const connectors = connectorRegistry.filter((connector) => connector.category === category);
        if (connectors.length === 0) return null;

        return (
          <section key={category}>
            <div className="mb-3 flex items-center gap-2">
              <PlugZap className="h-4 w-4 text-[var(--ld-color-accent)]" />
              <h3 className="text-sm font-semibold text-white">{categoryLabels[category]}</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {connectors.map((connector) => {
                const isConfigured = getConnectorSetupState(connector.id);
                const status = connector.availability === "available" && isConfigured
                  ? {
                      label: "Ready to verify",
                      className: "border-cyan-300/22 bg-cyan-400/10 text-cyan-100",
                    }
                  : availabilityMeta[connector.availability];
                const StatusIcon = connector.availability === "available"
                  ? isConfigured
                    ? ShieldCheck
                    : PlugZap
                  : connector.availability === "mapped_import"
                    ? FileInput
                    : Clock3;
                return (
                  <article key={connector.id} className="admin-surface-soft flex min-h-[220px] flex-col rounded-[22px] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{connector.label}</p>
                        <p className="mt-1 text-sm leading-5 text-white/64">{connector.description}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    {connector.operations ? (
                      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-5">
                        <Link href={connector.operations.setupPath} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-sm font-semibold text-[var(--ld-color-accent)] transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white">
                          {connector.availability === "mapped_import" ? "Start migration" : isConfigured ? "Review setup" : "Set up"}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        {isConfigured && connector.operations.healthPath ? (
                          <Link href={connector.operations.healthPath} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-white/70 transition hover:text-white">
                            Check status
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        {isConfigured && connector.operations.retryPath ? (
                          <Link href={connector.operations.retryPath} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-white/70 transition hover:text-white">
                            Review failures
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-auto pt-5 text-xs font-medium leading-5 text-white/52">
                        {connector.availability === "planned"
                          ? "No connection path is available yet."
                          : "Requires a server-side deployment adapter before activation."}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
