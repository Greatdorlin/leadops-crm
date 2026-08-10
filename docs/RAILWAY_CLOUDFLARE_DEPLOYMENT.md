# Railway and Cloudflare deployment profile

## Recommended starter topology

Use one isolated Railway project per customer and one isolated Postgres database per customer. Put the customer hostname behind Cloudflare.

```text
Customer browser
  -> Cloudflare DNS, TLS, proxy, WAF and static-asset caching
  -> Railway Leads Desk app service
  -> private Railway Postgres service
```

This keeps the current Node, Next.js, Auth.js, Postgres, migration, and Docker contracts intact. It removes routine VPS patching and process supervision without merging customers into a shared application or database.

The Cloudflare layer must not cache authenticated HTML, authenticated API responses, or responses carrying `Set-Cookie`. Cache immutable Next.js assets and explicitly public assets only. The Railway origin remains the application runtime and Cloudflare remains the edge and security layer.

## Isolation contract

Each customer receives:

- a separate Railway project or separately permissioned environment;
- a separate app service and `DATABASE_URL`;
- a separate database and backup policy;
- separate application secrets and integration credentials;
- a separate Cloudflare hostname and narrowly scoped API token;
- separate usage alerts, hard limits, logs, and restore evidence.

Never place multiple customer databases behind one shared secret or let one customer deployment read another customer's environment variables.

## Cost target

An infrastructure target below USD 20 per month is credible for a small, lightly used starter workspace, but it is not a universal fixed price.

The operator must estimate and then measure:

- average and peak app memory;
- average CPU time and wake frequency;
- Postgres memory, storage, and backup retention;
- outbound traffic and uploaded assets;
- availability/support tier;
- log and monitoring retention.

Railway bills compute and storage from actual usage and applies a plan minimum. An always-running process still consumes memory even when idle. Cloudflare's free proxy can cover DNS, TLS, DDoS protection, and normal static caching; Workers Paid or other paid Cloudflare products add their own minimums.

For an inexpensive starter deployment, begin with one app replica, a small database, Cloudflare Free, usage alerts, and a hard cost limit. Do not describe the target as guaranteed until a representative customer workload has run for a complete billing cycle. Railway Pro currently has a USD 20 minimum before any separately billed Cloudflare or database service, so a professionally managed Pro deployment is not an under-USD-20 offer.

## Compact runtime profile

Use these starting values for a low-traffic single-instance deployment, then adjust from metrics:

```dotenv
DATABASE_POOL_MAX=3
DATABASE_IDLE_TIMEOUT_SECONDS=10
DATABASE_CONNECT_TIMEOUT_SECONDS=20
NEXT_TELEMETRY_DISABLED=1
```

Keep the app and database in the same Railway region and use the private database address. Do not expose Postgres publicly for normal runtime access.

Resource rules:

- preserve the standalone Next.js Docker image;
- keep one replica until measured traffic requires more;
- disable route prefetch on high-cardinality operational lists;
- keep queue, report, and export queries bounded and database-side;
- avoid client polling unless a workflow has a measured need;
- store large assets in object storage rather than Postgres;
- schedule backups outside peak usage and verify restores;
- use per-project alerts and a hard usage limit with an agreed outage policy.

## Cloudflare Workers option

Running the full app on Cloudflare Workers through OpenNext is a separate deployment target, not a configuration toggle. Next.js 16 support exists, but this repository must first prove compatibility for Auth.js, `postgres`, `bcryptjs`, Google APIs, image handling, middleware, bundle size, and all route handlers. Hyperdrive can pool and cache Postgres queries, but it does not remove database cost or make mutations cacheable.

Do not move customer production to Workers until a staging build passes the complete auth, forms, integrations, import/export, migration, and browser verification matrix. Until then, Cloudflare in front of Railway is the lower-risk managed topology.

## Release sequence

1. Create the customer-owned or customer-dedicated Railway project.
2. Create Postgres and configure backups before importing production data.
3. Set the provider-neutral environment variables and unique secrets.
4. Apply migrations through the established migration command.
5. Deploy the Docker service using `railway.json` and verify `/api/health`.
6. Verify login, lead creation/update, forms, permissions, exports, and integrations.
7. Add the proxied Cloudflare hostname with Full (strict) TLS.
8. Cache only immutable/static paths; bypass authenticated and API routes.
9. Set usage alerts and the agreed hard limit.
10. Record backup, restore, owner, region, deployed commit, and monthly cost evidence.
