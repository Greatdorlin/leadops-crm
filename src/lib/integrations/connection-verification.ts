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

    const response = await fetcher("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${normalizeEnvValue(environment.LINKEDIN_ACCESS_TOKEN)}`,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        configured: true,
        verified: false,
        message: providerFailure(
          "LinkedIn",
          response.status,
          "Check the token expiry and Lead Sync permissions.",
        ),
      };
    }
    const account = (await response.json()) as { name?: string; email?: string; sub?: string };
    return {
      configured: true,
      verified: true,
      message: "LinkedIn accepted the access token.",
      accountName: account.name || account.email || account.sub,
    };
  }

  if (provider === "google_ads") {
    const configured = required(environment, [
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
    ]);
    if (!configured) {
      return {
        configured: false,
        verified: false,
        message: "Add the Google Ads OAuth, developer token, and customer ID in the deployment first.",
      };
    }

    const tokenResponse = await fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: normalizeEnvValue(environment.GOOGLE_ADS_CLIENT_ID),
        client_secret: normalizeEnvValue(environment.GOOGLE_ADS_CLIENT_SECRET),
        refresh_token: normalizeEnvValue(environment.GOOGLE_ADS_REFRESH_TOKEN),
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      return {
        configured: true,
        verified: false,
        message: providerFailure(
          "Google",
          tokenResponse.status,
          "Check the OAuth client and refresh token.",
        ),
      };
    }
    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) {
      return {
        configured: true,
        verified: false,
        message: "Google did not return an access token.",
      };
    }

    const accountResponse = await fetcher(
      "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          "developer-token": normalizeEnvValue(environment.GOOGLE_ADS_DEVELOPER_TOKEN),
        },
        cache: "no-store",
      },
    );
    if (!accountResponse.ok) {
      return {
        configured: true,
        verified: false,
        message: providerFailure(
          "Google Ads",
          accountResponse.status,
          "Check the developer token and customer-account access.",
        ),
      };
    }
    const account = (await accountResponse.json()) as { resourceNames?: string[] };
    const customerId = normalizeEnvValue(environment.GOOGLE_ADS_CUSTOMER_ID);
    const accessible = (account.resourceNames ?? []).some((name) =>
      name.replace(/\D/g, "").endsWith(customerId.replace(/\D/g, "")),
    );
    return {
      configured: true,
      verified: accessible,
      message: accessible
        ? "Google Ads confirmed access to the configured customer account."
        : "Google accepted the credentials, but the configured customer account is not accessible.",
      accountName: accessible ? customerId : undefined,
    };
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
      message: "Google Sheets confirmed access to the configured spreadsheet.",
      accountName: spreadsheet.title,
    };
  } catch (error) {
    return {
      configured: true,
      verified: false,
      message:
        error instanceof Error
          ? `Google Sheets could not verify access. ${error.message}`
          : "Google Sheets could not verify access.",
    };
  }
}
