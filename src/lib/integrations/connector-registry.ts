export type ConnectorCategory =
  | "lead_capture"
  | "crm_migration"
  | "email_marketing"
  | "communication"
  | "automation"
  | "reporting";

export type ConnectorAvailability = "available" | "mapped_import" | "adapter_ready" | "planned";

export type ConnectorConnectionMethod =
  | "oauth2"
  | "api_key"
  | "webhook"
  | "service_account"
  | "mapped_file";

export interface ConnectorOperations {
  setupPath: string;
  healthPath?: string;
  retryPath?: string;
}

export interface ConnectorDefinition {
  id: string;
  label: string;
  category: ConnectorCategory;
  availability: ConnectorAvailability;
  connectionMethods: ConnectorConnectionMethod[];
  description: string;
  operations?: ConnectorOperations;
}

export const connectorRegistry: ConnectorDefinition[] = [
  {
    id: "website_forms",
    label: "Website forms",
    category: "lead_capture",
    availability: "available",
    connectionMethods: ["webhook"],
    description: "Built-in forms with submission activity and failure review.",
    operations: { setupPath: "/forms", healthPath: "/intake" },
  },
  {
    id: "custom_webhook",
    label: "Custom webhook",
    category: "lead_capture",
    availability: "available",
    connectionMethods: ["webhook"],
    description: "Key-protected JSON intake with field mapping and delivery logs.",
    operations: { setupPath: "/settings/form-sources", healthPath: "/intake" },
  },
  {
    id: "meta_lead_ads",
    label: "Meta Lead Ads",
    category: "lead_capture",
    availability: "available",
    connectionMethods: ["webhook", "api_key"],
    description: "Verified Facebook and Instagram lead webhook intake.",
    operations: {
      setupPath: "/integrations/facebook#setup",
      healthPath: "/integrations/facebook#health",
      retryPath: "/integrations/facebook#failed-imports",
    },
  },
  {
    id: "google_ads",
    label: "Google Ads",
    category: "lead_capture",
    availability: "available",
    connectionMethods: ["webhook", "oauth2"],
    description: "Key-protected lead intake with optional campaign reporting.",
    operations: {
      setupPath: "/integrations/google-ads#setup",
      healthPath: "/integrations/google-ads#health",
      retryPath: "/integrations/google-ads#failed-imports",
    },
  },
  {
    id: "tiktok",
    label: "TikTok",
    category: "lead_capture",
    availability: "available",
    connectionMethods: ["webhook"],
    description: "Shared-secret lead webhook intake with retained failures.",
    operations: {
      setupPath: "/integrations/tiktok#setup",
      healthPath: "/integrations/tiktok#health",
      retryPath: "/integrations/tiktok#failed-imports",
    },
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    category: "lead_capture",
    availability: "available",
    connectionMethods: ["webhook", "oauth2"],
    description: "Verified Lead Sync notifications and form-response intake.",
    operations: {
      setupPath: "/integrations/linkedin#setup",
      healthPath: "/integrations/linkedin#health",
      retryPath: "/integrations/linkedin#failed-imports",
    },
  },
  {
    id: "hubspot",
    label: "HubSpot",
    category: "crm_migration",
    availability: "mapped_import",
    connectionMethods: ["mapped_file"],
    description: "Mapped contact CSV import with original source rows retained.",
    operations: { setupPath: "/leads?composer=import&migrationSource=hubspot#lead-action-center" },
  },
  {
    id: "zoho_crm",
    label: "Zoho CRM",
    category: "crm_migration",
    availability: "mapped_import",
    connectionMethods: ["mapped_file"],
    description: "Mapped lead or contact CSV import with source rows retained.",
    operations: { setupPath: "/leads?composer=import&migrationSource=zoho_crm#lead-action-center" },
  },
  {
    id: "salesforce",
    label: "Salesforce",
    category: "crm_migration",
    availability: "mapped_import",
    connectionMethods: ["mapped_file"],
    description: "Mapped lead or contact CSV import with source rows retained.",
    operations: { setupPath: "/leads?composer=import&migrationSource=salesforce#lead-action-center" },
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    category: "crm_migration",
    availability: "mapped_import",
    connectionMethods: ["mapped_file"],
    description: "Mapped people CSV import with original source rows retained.",
    operations: { setupPath: "/leads?composer=import&migrationSource=pipedrive#lead-action-center" },
  },
  {
    id: "sender",
    label: "Sender",
    category: "email_marketing",
    availability: "adapter_ready",
    connectionMethods: ["api_key"],
    description: "Provider-neutral contract ready; no production adapter is active.",
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    category: "email_marketing",
    availability: "adapter_ready",
    connectionMethods: ["oauth2"],
    description: "Provider-neutral contract ready; deployment adapter required.",
  },
  {
    id: "brevo",
    label: "Brevo",
    category: "email_marketing",
    availability: "adapter_ready",
    connectionMethods: ["api_key"],
    description: "Provider-neutral contract ready; deployment adapter required.",
  },
  {
    id: "activecampaign",
    label: "ActiveCampaign",
    category: "email_marketing",
    availability: "adapter_ready",
    connectionMethods: ["api_key"],
    description: "Provider-neutral contract ready; deployment adapter required.",
  },
  {
    id: "custom_email",
    label: "Custom email platform",
    category: "email_marketing",
    availability: "adapter_ready",
    connectionMethods: ["webhook"],
    description: "Provider-neutral contract ready; deployment adapter required.",
  },
  {
    id: "whatsapp_business",
    label: "WhatsApp Business",
    category: "communication",
    availability: "planned",
    connectionMethods: ["oauth2"],
    description: "Planned messaging connector; no active connection path.",
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    category: "reporting",
    availability: "available",
    connectionMethods: ["service_account"],
    description: "Configured worksheet import and controlled lead export.",
    operations: {
      setupPath: "/integrations/google-sheets",
      healthPath: "/integrations/google-sheets",
    },
  },
  {
    id: "zapier_make",
    label: "Zapier / Make",
    category: "automation",
    availability: "adapter_ready",
    connectionMethods: ["webhook"],
    description: "Inbound webhooks exist; outbound automation requires an adapter.",
  },
];

export function listConnectorsByCategory(category: ConnectorCategory) {
  return connectorRegistry.filter((connector) => connector.category === category);
}
