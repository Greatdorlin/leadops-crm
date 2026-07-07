import { LEAD_SOURCES } from "@/lib/crm/constants";
import { formatLeadSourceLabel } from "@/lib/crm/labels";
import { DEFAULT_LEADS_DESK_SOURCE_ROWS, LEADS_DESK_SOURCE_BACKFILL_PLAN } from "@/lib/db/defaults";
import type { LeadSource } from "@/lib/crm/types";

type SourceOptionRecord = {
  key: string;
  name: string;
  archived?: boolean;
};

const normalizedToLegacySource = new Map<string, LeadSource>();

for (const [legacySource, normalizedSource] of Object.entries(LEADS_DESK_SOURCE_BACKFILL_PLAN)) {
  if (!normalizedToLegacySource.has(normalizedSource)) {
    normalizedToLegacySource.set(normalizedSource, legacySource as LeadSource);
  }
}

const compatibilitySourceMap: Record<string, LeadSource> = {
  website: "website_form",
  wordpress_form: "website_form",
  facebook_ads: "facebook_lead_ads",
  google_ads: "google_ads",
  tiktok_ads: "tiktok_lead_ads",
  instagram: "agent",
  referral: "referral",
  call: "whatsapp_inquiry",
  walk_in: "manual_entry",
  csv_import: "google_sheets",
  manual_entry: "manual_entry",
  other: "agent",
};

function resolveLegacySourceValue(key: string): LeadSource | null {
  if ((LEAD_SOURCES as readonly string[]).includes(key)) {
    return key as LeadSource;
  }

  return normalizedToLegacySource.get(key) ?? compatibilitySourceMap[key] ?? null;
}

export function buildFormDefaultSourceOptions(
  sources: SourceOptionRecord[],
): Array<{ value: string; label: string }> {
  const options = new Map<string, { value: string; label: string }>();

  for (const source of sources) {
    if (source.archived) {
      continue;
    }

    const legacySource = resolveLegacySourceValue(source.key);
    if (!legacySource || options.has(legacySource)) {
      continue;
    }

    options.set(legacySource, {
      value: legacySource,
      label: source.name.trim() || formatLeadSourceLabel(legacySource),
    });
  }

  for (const legacySource of LEAD_SOURCES) {
    if (options.has(legacySource)) {
      continue;
    }

    const fallbackSource = DEFAULT_LEADS_DESK_SOURCE_ROWS.find(
      (source) => source.key === LEADS_DESK_SOURCE_BACKFILL_PLAN[legacySource],
    );

    options.set(legacySource, {
      value: legacySource,
      label: fallbackSource?.name ?? formatLeadSourceLabel(legacySource),
    });
  }

  return Array.from(options.values());
}
