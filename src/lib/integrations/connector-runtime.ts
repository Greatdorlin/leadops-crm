import type { IntegrationProvider } from "@/lib/crm/types";
import { hasConfiguredEnvValue } from "@/lib/env-utils";
import { isGoogleAdsConfigured } from "./google-ads/client";

type ConfiguredConnector = Exclude<IntegrationProvider, "website" | "sender">;
type ConnectorEnvironment = Readonly<Record<string, string | undefined>>;

const requiredEnvironment: Record<ConfiguredConnector, readonly string[]> = {
  facebook: ["META_APP_SECRET", "META_PAGE_ACCESS_TOKEN", "META_VERIFY_TOKEN"],
  google_sheets: [
    "GOOGLE_SHEETS_SPREADSHEET_ID",
    "GOOGLE_SHEETS_WORKSHEET_NAME",
    "GOOGLE_SHEETS_CLIENT_EMAIL",
    "GOOGLE_SHEETS_PRIVATE_KEY",
  ],
  google_ads: ["GOOGLE_ADS_WEBHOOK_KEY"],
  tiktok: ["TIKTOK_WEBHOOK_SECRET"],
  linkedin: ["LINKEDIN_CLIENT_SECRET", "LINKEDIN_ACCESS_TOKEN"],
};

function hasAll(environment: ConnectorEnvironment, names: readonly string[]) {
  return names.every((name) => hasConfiguredEnvValue(environment[name]));
}

export function isConnectorConfigured(
  provider: IntegrationProvider,
  environment: ConnectorEnvironment = process.env,
) {
  if (provider === "website") return true;
  if (provider === "sender") return false;
  if (provider === "google_ads" && isGoogleAdsConfigured(environment)) return true;
  return hasAll(environment, requiredEnvironment[provider]);
}

export function isConnectorOperationConfigured(
  provider: IntegrationProvider,
  endpoint: string,
  environment: ConnectorEnvironment = process.env,
) {
  if (provider === "google_ads") {
    return endpoint.includes("sync-performance")
      ? isGoogleAdsConfigured(environment)
      : hasAll(environment, requiredEnvironment.google_ads);
  }
  return isConnectorConfigured(provider, environment);
}

export function getConnectorSetupState(
  connectorId: string,
  environment: ConnectorEnvironment = process.env,
) {
  const providerByConnector: Partial<Record<string, IntegrationProvider>> = {
    meta_lead_ads: "facebook",
    google_ads: "google_ads",
    tiktok: "tiktok",
    linkedin: "linkedin",
    google_sheets: "google_sheets",
  };
  const provider = providerByConnector[connectorId];
  return provider ? isConnectorConfigured(provider, environment) : false;
}
