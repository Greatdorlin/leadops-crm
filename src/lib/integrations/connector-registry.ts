export type ConnectorCategory =
  | "lead_capture"
  | "crm_migration"
  | "email_marketing"
  | "communication"
  | "automation"
  | "reporting";

export type ConnectorAvailability = "available" | "mapped_import" | "adapter_ready" | "planned";

export interface ConnectorDefinition {
  id: string;
  label: string;
  category: ConnectorCategory;
  availability: ConnectorAvailability;
  connectionMethod: "oauth2" | "api_key" | "webhook" | "service_account" | "mapped_file";
  description: string;
}

export const connectorRegistry: ConnectorDefinition[] = [
  { id: "website_forms", label: "Website forms", category: "lead_capture", availability: "available", connectionMethod: "webhook", description: "Built-in forms and signed webhooks." },
  { id: "custom_webhook", label: "Custom webhook", category: "lead_capture", availability: "available", connectionMethod: "webhook", description: "Map fields from any system that can send JSON." },
  { id: "meta_lead_ads", label: "Meta Lead Ads", category: "lead_capture", availability: "available", connectionMethod: "webhook", description: "Facebook and Instagram lead capture." },
  { id: "google_ads", label: "Google Ads", category: "lead_capture", availability: "available", connectionMethod: "api_key", description: "Lead intake and campaign attribution." },
  { id: "tiktok", label: "TikTok", category: "lead_capture", availability: "available", connectionMethod: "webhook", description: "Signed lead webhook intake." },
  { id: "linkedin", label: "LinkedIn", category: "lead_capture", availability: "available", connectionMethod: "oauth2", description: "Lead form response intake." },
  { id: "hubspot", label: "HubSpot", category: "crm_migration", availability: "mapped_import", connectionMethod: "mapped_file", description: "Loss-aware mapped export migration." },
  { id: "zoho_crm", label: "Zoho CRM", category: "crm_migration", availability: "mapped_import", connectionMethod: "mapped_file", description: "Loss-aware mapped export migration." },
  { id: "salesforce", label: "Salesforce", category: "crm_migration", availability: "mapped_import", connectionMethod: "mapped_file", description: "Loss-aware mapped export migration." },
  { id: "pipedrive", label: "Pipedrive", category: "crm_migration", availability: "mapped_import", connectionMethod: "mapped_file", description: "Loss-aware mapped export migration." },
  { id: "sender", label: "Sender", category: "email_marketing", availability: "available", connectionMethod: "api_key", description: "Sync leads to configured email groups." },
  { id: "mailchimp", label: "Mailchimp", category: "email_marketing", availability: "adapter_ready", connectionMethod: "oauth2", description: "Connector contract ready for a deployment adapter." },
  { id: "brevo", label: "Brevo", category: "email_marketing", availability: "adapter_ready", connectionMethod: "api_key", description: "Connector contract ready for a deployment adapter." },
  { id: "activecampaign", label: "ActiveCampaign", category: "email_marketing", availability: "adapter_ready", connectionMethod: "api_key", description: "Connector contract ready for a deployment adapter." },
  { id: "custom_email", label: "Custom email platform", category: "email_marketing", availability: "adapter_ready", connectionMethod: "webhook", description: "Provider-neutral outbound event contract." },
  { id: "whatsapp_business", label: "WhatsApp Business", category: "communication", availability: "planned", connectionMethod: "oauth2", description: "Planned messaging connector; not presented as connected." },
  { id: "google_sheets", label: "Google Sheets", category: "reporting", availability: "available", connectionMethod: "service_account", description: "Controlled lead export." },
  { id: "zapier_make", label: "Zapier / Make", category: "automation", availability: "adapter_ready", connectionMethod: "webhook", description: "Signed inbound webhooks are ready; outbound actions require an adapter." },
];

export function listConnectorsByCategory(category: ConnectorCategory) {
  return connectorRegistry.filter((connector) => connector.category === category);
}
