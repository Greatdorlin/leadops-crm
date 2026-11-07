# Put Leads Desk behind your Cloudflare domain

This path keeps the app on its current Node.js host and uses Cloudflare for the domain. It does not move the app or database.

1. In your app host, add the domain you want people to use, such as crm.yourcompany.com.
2. The host will show a DNS record. In Cloudflare → DNS, add that exact record. Start with DNS only while the host verifies the domain and issues its certificate.
3. Wait until the host says the domain is ready. Open its HTTPS address and confirm there is no certificate warning.
4. Set NEXTAUTH_URL, CRM_PUBLIC_BASE_URL and NEXT_PUBLIC_APP_URL to that HTTPS address in the app host. Redeploy the app. Never place the database password in a DNS record.
5. Sign in, add a test lead, refresh and check the lead. Open Inbox with a second team account. Test any public form and external connector you use.
6. If you enable Cloudflare proxying, use Full (strict) TLS. Do not cache dashboard pages, sign-in responses, APIs or other private workspace content. Follow the host’s proxy requirements.

For a new installation, follow [INSTALL.md](./INSTALL.md) first. For a Docker server, read DEPLOY_VPS.md in your repository.

## Hosting inside Cloudflare Workers

Status on 7 November 2026: not certified for this release. The actual `npx vinext check` reports next-auth as incompatible with the proposed runtime, plus partial support for Sentry build instrumentation and webpack options. A successful Next.js build does not prove that sign-in works on Workers.

The remaining acceptance checks are a compatible sign-in implementation or adapter, a Worker production build, PostgreSQL connection lifecycle verification, encrypted Inbox checks, uploads, scoped reports and public forms. Keep the working deployment serving users until those checks pass. This release does not silently replace authentication or move a production database.

Official migration instructions: https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/nextjs/
