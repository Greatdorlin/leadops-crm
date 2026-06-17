# Ad Integrations Setup

## Production base URL

Set this in Vercel:

`CRM_PUBLIC_BASE_URL=https://pathway.flyconnectglobal.com`

## Meta / Facebook

Platform gives us:
- App ID
- App Secret
- Page Access Token

We create ourselves:
- `META_VERIFY_TOKEN`

Optional:
- `META_GRAPH_API_VERSION`

Add these Vercel env vars:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_PAGE_ACCESS_TOKEN`
- `META_VERIFY_TOKEN`
- `META_GRAPH_API_VERSION`

Webhook URL:
`https://pathway.flyconnectglobal.com/api/integrations/facebook/webhook`

Basic setup steps:
1. Add the env vars in Vercel Production.
2. In Meta, paste the webhook URL.
3. Use `META_VERIFY_TOKEN` as the verify token.
4. Subscribe the page to `leadgen`.
5. Send a test lead.
6. Confirm the lead appears in the CRM.

## Google Ads

### New leads into CRM

We create ourselves:
- `GOOGLE_ADS_WEBHOOK_KEY`

Add this Vercel env var:
- `GOOGLE_ADS_WEBHOOK_KEY`

Webhook URL:
`https://pathway.flyconnectglobal.com/api/integrations/google-ads/webhook`

Basic setup steps:
1. Add `GOOGLE_ADS_WEBHOOK_KEY` in Vercel Production.
2. In Google Ads lead form webhook setup, paste the webhook URL.
3. Use the same key.
4. Send a test lead.
5. Confirm the lead appears in the CRM.

### Campaign/performance sync

Platform gives us:
- Developer Token
- OAuth Client ID
- OAuth Client Secret
- Refresh Token
- Customer ID
- Login Customer ID if using a manager account

Add these Vercel env vars:
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

Basic setup steps:
1. Add the env vars in Vercel Production.
2. Open the admin Google Ads integration page.
3. Click `Refresh performance`.
4. Confirm campaign rows appear.

Important:
If the goal is only "new leads into CRM", the webhook key and webhook setup are the main part. The OAuth and developer-token setup are for campaign reporting.

## TikTok

We create ourselves:
- `TIKTOK_WEBHOOK_SECRET`

Add this Vercel env var:
- `TIKTOK_WEBHOOK_SECRET`

Webhook URL:
`https://pathway.flyconnectglobal.com/api/integrations/tiktok/webhook`

Basic setup steps:
1. Add `TIKTOK_WEBHOOK_SECRET` in Vercel Production.
2. In TikTok Ads Manager, open the lead form delivery or Custom API/Webhooks setup.
3. Paste the webhook URL.
4. Use the same secret if TikTok asks for one.
5. Enable the form subscription.
6. Send a test lead.
7. Confirm the lead appears in the CRM.

Important:
Do not mark TikTok complete until a real or test TikTok lead reaches the CRM.

## LinkedIn

Platform gives us:
- Client Secret
- Access Token

Optional:
- `LINKEDIN_API_VERSION`

Add these Vercel env vars:
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_API_VERSION`

Webhook URL:
`https://pathway.flyconnectglobal.com/api/integrations/linkedin/webhook`

Basic setup steps:
1. Confirm the LinkedIn app has Lead Sync API access.
2. Add the env vars in Vercel Production.
3. Configure lead delivery according to LinkedIn's Lead Sync requirements.
4. Send or fetch a test lead.
5. Confirm the lead appears in the CRM.

Important:
LinkedIn Lead Sync API access is separate from normal ads access.

## After setting env vars in Vercel

1. Redeploy production or trigger a production rebuild if needed.
2. Test each platform with one test lead.
3. Confirm each test lead appears in the CRM.
4. Confirm failed payloads are visible or logged safely.
5. Do not expose secrets in logs.
