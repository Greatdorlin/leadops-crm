import { normalizeEnvValue } from "@/lib/env-utils";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v25";

interface GoogleAdsMetricRow {
  campaign: {
    id?: string;
    name?: string;
  };
  adGroup?: {
    id?: string;
    name?: string;
  };
  adGroupAd?: {
    ad?: {
      id?: string;
      name?: string;
    };
  };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
  };
  segments?: {
    date?: string;
  };
}

interface GoogleAdsSearchBatch {
  results?: GoogleAdsMetricRow[];
}

async function getGoogleAdsAccessToken(environment: Readonly<Record<string, string | undefined>>, fetcher: typeof fetch) {
  const clientId = normalizeEnvValue(environment.GOOGLE_ADS_CLIENT_ID);
  const clientSecret = normalizeEnvValue(environment.GOOGLE_ADS_CLIENT_SECRET);
  const refreshToken = normalizeEnvValue(environment.GOOGLE_ADS_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Ads OAuth credentials are not configured.");
  }

  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { access_token: string };
  if (!payload.access_token) throw new Error("Google OAuth did not return an access token.");
  return payload.access_token;
}

export function isGoogleAdsConfigured(environment: Readonly<Record<string, string | undefined>> = process.env) {
  return [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
  ].every((key) => Boolean(normalizeEnvValue(environment[key])));
}

export function getGoogleAdsWebhookKey() {
  return process.env.GOOGLE_ADS_WEBHOOK_KEY?.trim() ?? "";
}

export function isGoogleAdsLeadWebhookConfigured() {
  return Boolean(getGoogleAdsWebhookKey());
}

export function getGoogleAdsCustomerId(environment: Readonly<Record<string, string | undefined>> = process.env) {
  return normalizeEnvValue(environment.GOOGLE_ADS_CUSTOMER_ID).replace(/-/g, "");
}

export async function queryGoogleAds(
  query: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const developerToken = normalizeEnvValue(environment.GOOGLE_ADS_DEVELOPER_TOKEN);
  const loginCustomerId = normalizeEnvValue(environment.GOOGLE_ADS_LOGIN_CUSTOMER_ID).replace(/-/g, "");
  const customerId = getGoogleAdsCustomerId(environment);

  if (!developerToken || !/^\d{10}$/.test(customerId) || (loginCustomerId && !/^\d{10}$/.test(loginCustomerId))) {
    throw new Error("Google Ads requires a valid 10-digit customer ID and, if used, manager account ID.");
  }

  const accessToken = await getGoogleAdsAccessToken(environment, fetcher);
  const response = await fetcher(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "developer-token": developerToken,
        ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Google Ads account query failed with ${response.status}. Check the developer token and account access.`);
  }

  return response;
}

export async function fetchGoogleAdsCampaignMetrics(dateFrom?: string, dateTo?: string) {
  const response = await queryGoogleAds(`
          SELECT
            campaign.id,
            campaign.name,
            ad_group.id,
            ad_group.name,
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            segments.date
          FROM ad_group_ad
          WHERE segments.date BETWEEN '${dateFrom ?? "2026-01-01"}' AND '${dateTo ?? new Date().toISOString().slice(0, 10)}'
  `);

  return (await response.json()) as GoogleAdsSearchBatch[];
}
