export const CRM_MIGRATION_SOURCES = [
  "generic_csv",
  "hubspot",
  "zoho_crm",
  "salesforce",
  "pipedrive",
  "other_crm",
] as const;

export type CrmMigrationSource = (typeof CRM_MIGRATION_SOURCES)[number];

export interface MigrationSourceDefinition {
  id: CrmMigrationSource;
  label: string;
  importPath: "mapped_csv" | "adapter";
  normalizedObjects: string[];
  archiveReadyObjects: string[];
  rawPayloadRetention: true;
}

export const migrationSourceRegistry: MigrationSourceDefinition[] = [
  {
    id: "generic_csv",
    label: "CSV or spreadsheet",
    importPath: "mapped_csv",
    normalizedObjects: ["leads", "contacts"],
    archiveReadyObjects: ["leads", "contacts"],
    rawPayloadRetention: true,
  },
  {
    id: "hubspot",
    label: "HubSpot",
    importPath: "mapped_csv",
    normalizedObjects: ["contacts"],
    archiveReadyObjects: ["contacts", "companies", "deals", "notes", "tasks"],
    rawPayloadRetention: true,
  },
  {
    id: "zoho_crm",
    label: "Zoho CRM",
    importPath: "mapped_csv",
    normalizedObjects: ["leads", "contacts"],
    archiveReadyObjects: ["leads", "contacts", "accounts", "deals", "notes", "tasks"],
    rawPayloadRetention: true,
  },
  {
    id: "salesforce",
    label: "Salesforce",
    importPath: "mapped_csv",
    normalizedObjects: ["leads", "contacts"],
    archiveReadyObjects: ["leads", "contacts", "accounts", "opportunities", "notes", "tasks"],
    rawPayloadRetention: true,
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    importPath: "mapped_csv",
    normalizedObjects: ["people"],
    archiveReadyObjects: ["people", "organizations", "deals", "notes", "activities"],
    rawPayloadRetention: true,
  },
  {
    id: "other_crm",
    label: "Another CRM",
    importPath: "mapped_csv",
    normalizedObjects: ["leads", "contacts"],
    archiveReadyObjects: ["leads", "contacts"],
    rawPayloadRetention: true,
  },
];

export function isCrmMigrationSource(value: unknown): value is CrmMigrationSource {
  return typeof value === "string" && CRM_MIGRATION_SOURCES.includes(value as CrmMigrationSource);
}
