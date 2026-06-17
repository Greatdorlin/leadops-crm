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

async function getGoogleAdsAccessToken() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Ads OAuth credentials are not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
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
  return payload.access_token;
}

export function isGoogleAdsConfigured() {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID,
  );
}

export function getGoogleAdsWebhookKey() {
  return process.env.GOOGLE_ADS_WEBHOOK_KEY?.trim() ?? "";
}

export function isGoogleAdsLeadWebhookConfigured() {
  return Boolean(getGoogleAdsWebhookKey());
}

export async function fetchGoogleAdsCampaignMetrics(dateFrom?: string, dateTo?: string) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!developerToken || !customerId) {
    throw new Error("Google Ads account configuration is missing.");
  }

  const accessToken = await getGoogleAdsAccessToken();
  const response = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "developer-token": developerToken,
        ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
      },
      body: JSON.stringify({
        query: `
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
        `,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Google Ads metrics request failed with ${response.status}.`);
  }

  return (await response.json()) as GoogleAdsSearchBatch[];
}
