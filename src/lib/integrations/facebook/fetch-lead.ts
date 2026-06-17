interface FacebookLeadField {
  name: string;
  values?: string[];
}

export interface FacebookLeadPayload {
  id: string;
  created_time?: string;
  ad_id?: string;
  adgroup_id?: string;
  campaign_id?: string;
  form_id?: string;
  page_id?: string;
  field_data?: FacebookLeadField[];
  [key: string]: unknown;
}

export async function fetchFacebookLead(leadgenId: string) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || "v22.0";

  if (!accessToken) {
    throw new Error("META_PAGE_ACCESS_TOKEN is not configured.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${version}/${leadgenId}?access_token=${accessToken}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Meta Graph API returned ${response.status}.`);
  }

  return (await response.json()) as FacebookLeadPayload;
}
