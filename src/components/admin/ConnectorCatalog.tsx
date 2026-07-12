import Link from "next/link";
import { ArrowUpRight, Check, Clock3, FileInput, PlugZap } from "lucide-react";
import {
  connectorRegistry,
  type ConnectorAvailability,
  type ConnectorCategory,
} from "@/lib/integrations/connector-registry";
import { appRoutes } from "@/lib/app-routes";

const categoryLabels: Record<ConnectorCategory, string> = {
  lead_capture: "Lead capture",
  crm_migration: "CRM migration",
  email_marketing: "Email marketing",
  communication: "Communication",
  automation: "Automation",
  reporting: "Reporting",
};

const availabilityMeta: Record<ConnectorAvailability, { label: string; className: string }> = {
  available: { label: "Available", className: "border-emerald-300/22 bg-emerald-400/10 text-emerald-100" },
  mapped_import: { label: "Mapped import", className: "border-cyan-300/22 bg-cyan-400/10 text-cyan-100" },
  adapter_ready: { label: "Adapter ready", className: "border-amber-300/22 bg-amber-400/10 text-amber-100" },
  planned: { label: "Planned", className: "border-white/12 bg-white/[0.06] text-white/64" },
};

function connectorHref(id: string, availability: ConnectorAvailability) {
  if (availability === "mapped_import") {
    return `${appRoutes.leads}?composer=import&migrationSource=${encodeURIComponent(id)}#lead-action-center`;
  }

  const routes: Record<string, string> = {
    website_forms: appRoutes.forms,
    custom_webhook: appRoutes.settingsFormSources,
    meta_lead_ads: appRoutes.integration("facebook"),
    google_ads: appRoutes.integration("google-ads"),
    tiktok: appRoutes.integration("tiktok"),
    linkedin: appRoutes.integration("linkedin"),
    google_sheets: appRoutes.integration("google-sheets"),
  };
  return routes[id] ?? null;
}

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
                const status = availabilityMeta[connector.availability];
                const href = connectorHref(connector.id, connector.availability);
                const StatusIcon = connector.availability === "available"
                  ? Check
                  : connector.availability === "mapped_import"
                    ? FileInput
                    : Clock3;
                return (
                  <article key={connector.id} className="admin-surface-soft rounded-[22px] p-4">
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
                    {href ? (
                      <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ld-color-accent)] transition hover:text-white">
                        {connector.availability === "mapped_import" ? "Start migration" : "Open setup"}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <p className="mt-4 text-xs font-medium text-white/52">
                        Requires a deployment adapter before activation.
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
