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

OpenNext 1.20.16 successfully bundled this Next.js 16.4.5 app into `.open-next/worker.js` on 7 November 2026. This build keeps the existing NextAuth code. The earlier vinext compatibility warning applies to that different migration route.

Build the adapter bundle:

```sh
npm ci
npm run build:cloudflare
```

The generated bundle is a build artifact. Publishing it also needs a Workers entry point, static assets binding, production secrets and PostgreSQL connectivity. Keep secrets out of source files. Use a separate test database while checking sign-in, lead saving, encrypted Inbox, uploads, public forms and role restrictions in Workers.

Workers runtime status: these production checks have not passed yet. Keep the current host serving the live workspace until they do. A successful bundle build does not certify a working deployment.

Adapter documentation: https://opennext.js.org/cloudflare/get-started
