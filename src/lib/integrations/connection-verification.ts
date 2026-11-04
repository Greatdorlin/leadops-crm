import { getGoogleAdsCustomerId, isGoogleAdsConfigured, queryGoogleAds } from "./google-ads/client";
import { getLinkedInApiVersion } from "./linkedin/client";
import { normalizeEnvValue } from "@/lib/env-utils";
import { verifyGoogleSheetAccess } from "@/lib/google-sheets/client";

export const VERIFIABLE_INTEGRATION_PROVIDERS = [
  "facebook",
  "google_ads",
  "google_sheets",
  "linkedin",
  "tiktok",
] as const;

export type VerifiableIntegrationProvider =
  (typeof VERIFIABLE_INTEGRATION_PROVIDERS)[number];

export interface IntegrationVerificationResult {
  configured: boolean;
  verified: boolean;
  message: string;
  accountName?: string;
}

type Environment = Readonly<Record<string, string | undefined>>;
type Fetcher = typeof fetch;

function required(environment: Environment, names: readonly string[]) {
  return names.every((name) => Boolean(normalizeEnvValue(environment[name])));
}

function providerFailure(provider: string, status: number, guidance: string) {
  return `${provider} rejected the verification request (${status}). ${guidance}`;
}

export function isVerifiableIntegrationProvider(
  value: string,
): value is VerifiableIntegrationProvider {
  return (VERIFIABLE_INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export async function verifyIntegrationConnection(
  provider: VerifiableIntegrationProvider,
  environment: Environment = process.env,
  fetcher: Fetcher = fetch,
): Promise<IntegrationVerificationResult> {
  if (provider === "tiktok") {
    const configured = required(environment, ["TIKTOK_WEBHOOK_SECRET"]);
    return {
      configured,
      verified: false,
      message: configured
        ? "The server secret is present. Send a test lead from TikTok to verify delivery end to end."
        : "Add the TikTok webhook secret in the deployment before testing delivery.",
    };
  }

  if (provider === "facebook") {
    const configured = required(environment, [
      "META_APP_SECRET",
      "META_PAGE_ACCESS_TOKEN",
      "META_VERIFY_TOKEN",
    ]);
    if (!configured) {
      return {
        configured: false,
        verified: false,
        message: "Add the Meta app secret, page token, and verify token in the deployment first.",
      };
    }

    const version = normalizeEnvValue(environment.META_GRAPH_API_VERSION) || "v22.0";
    const accessToken = normalizeEnvValue(environment.META_PAGE_ACCESS_TOKEN);
    const response = await fetcher(`https://graph.facebook.com/${version}/me?fields=id,name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        configured: true,
        verified: false,
        message: providerFailure(
          "Meta",
          response.status,
          "Check the page token, app permissions, and selected Page.",
        ),
      };
    }
    const account = (await response.json()) as { id?: string; name?: string };
    return {
      configured: true,
      verified: true,
      message: "Meta accepted the page access token.",
      accountName: account.name || account.id,
    };
  }

  if (provider === "linkedin") {
    const configured = required(environment, [
      "LINKEDIN_CLIENT_SECRET",
      "LINKEDIN_ACCESS_TOKEN",
    ]);
    if (!configured) {
      return {
        configured: false,
        verified: false,
        message: "Add the LinkedIn client secret and access token in the deployment first.",
      };
    }

    const owner = normalizeEnvValue(environment.LINKEDIN_LEAD_SYNC_OWNER_URN);
    const ownerType = /^urn:li:(sponsoredAccount|organization):\d+$/.exec(owner)?.[1];
    if (!ownerType) {
      return {
        configured: true,
        verified: false,
        message: "Add the sponsored account or organization URN to verify Lead Sync access.",
      };
    }

    const response = await fetcher(
      `https://api.linkedin.com/rest/leadForms?owner=(${ownerType}:${encodeURIComponent(owner)})&q=owner&count=1&start=0`,
      {
        headers: {
          Authorization: `Bearer ${normalizeEnvValue(environment.LINKEDIN_ACCESS_TOKEN)}`,
          "Linkedin-Version": getLinkedInApiVersion(environment),
          "X-Restli-Protocol-Version": "2.0.0",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return {
        configured: true,
        verified: false,
        message: providerFailure(
          "LinkedIn",
          response.status,
          "Check token expiry, Lead Sync permissions, and access to the configured owner.",
        ),
      };
    }
    return {
      configured: true,
      verified: true,
      message: "LinkedIn accepted the Lead Sync request. Send a provider test lead to confirm delivery.",
      accountName: owner,
    };
  }

  if (provider === "google_ads") {
    const hasWebhook = Boolean(normalizeEnvValue(environment.GOOGLE_ADS_WEBHOOK_KEY));
    if (!isGoogleAdsConfigured(environment)) {
      return {
        configured: hasWebhook,
        verified: false,
        message: hasWebhook
          ? "The webhook key is present. Use Send test data in Google Ads to check delivery. Campaign reporting uses separate credentials."
          : "Add a Google Ads webhook key for lead delivery, or configure the separate campaign reporting credentials.",
      };
    }

    try {
      const response = await queryGoogleAds("SELECT customer.id FROM customer LIMIT 1", environment, fetcher);
      const customerId = getGoogleAdsCustomerId(environment);
      const batches = (await response.json()) as Array<{ results?: Array<{ customer?: { id?: string } }> }>;
      const accessible = batches.some((batch) =>
        batch.results?.some((row) => String(row.customer?.id) === customerId),
      );
      return {
        configured: true,
        verified: accessible,
        message: accessible
          ? "Google Ads confirmed campaign reporting access to the configured customer account."
          : "Google Ads did not return the configured customer account.",
        accountName: accessible ? customerId : undefined,
      };
    } catch (error) {
      return {
        configured: true,
        verified: false,
        message: error instanceof Error && /^(Google Ads|Google OAuth) /.test(error.message)
          ? error.message
          : "Google Ads could not verify reporting access.",
      };
    }
  }

  const configured = required(environment, [
    "GOOGLE_SHEETS_SPREADSHEET_ID",
    "GOOGLE_SHEETS_WORKSHEET_NAME",
    "GOOGLE_SHEETS_CLIENT_EMAIL",
    "GOOGLE_SHEETS_PRIVATE_KEY",
  ]);
  if (!configured) {
    return {
      configured: false,
      verified: false,
      message: "Add the spreadsheet, worksheet, and service-account credentials in the deployment first.",
    };
  }

  try {
    const spreadsheet = await verifyGoogleSheetAccess();
    return {
      configured: true,
      verified: true,
      message: "Google Sheets confirmed the configured worksheet exists and is readable. Export requires Editor access.",
      accountName: spreadsheet.title,
    };
  } catch (error) {
    return {
      configured: true,
      verified: false,
      message:
        error instanceof Error && error.message === "The configured worksheet tab was not found."
          ? error.message
          : "Google Sheets could not verify access. Check the worksheet name and share the spreadsheet with the service account.",
    };
  }
}
