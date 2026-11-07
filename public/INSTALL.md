# Install your own Leads Desk

Each company gets a separate installation and database. The steps below start with an empty database. For an existing installation, use the update steps at the end.

## Before you begin

You need access to the source repository, Node.js 24, and a PostgreSQL database. Keep the database password and your app secrets in your password manager.

Choose where the app will run:

- **Vercel:** connect the repository and add a managed PostgreSQL database. Use the Node.js runtime.
- A **VPS with Docker** gives you control of the server. Follow DEPLOY_VPS.md for the reverse proxy and HTTPS setup.
- **Cloudflare DNS** can point to either host. Running the app itself on Cloudflare needs a tested Next.js adapter; an ordinary Workers upload will not run this Node app. Verify database access and Node compatibility before moving a live workspace there.

## 1. Download the app

Run these commands in a terminal on your computer. Replace the repository address with the one you received.

```sh
git clone <your-private-repository-address> leads-desk
cd leads-desk
npm ci
cp .env.example .env
```

Open `.env` in a text editor. This file holds the settings for your installation. Keep it out of Git.

## 2. Fill in five settings

| Setting | What to enter |
| --- | --- |
| DATABASE_URL | The PostgreSQL connection string supplied by your database host. |
| AUTH_SECRET | A new secret from the command below. |
| NEXTAUTH_URL | Your final website address, including https://. For local testing, use http://localhost:3000. |
| INITIAL_ADMIN_EMAIL | The email address of the person who will own this workspace. |
| INITIAL_ADMIN_NAME | That person's name. |

Generate the sign-in secret:

```sh
openssl rand -base64 32
```

Set `CRM_PUBLIC_BASE_URL` and `NEXT_PUBLIC_APP_URL` to the same final website address. Leave optional provider credentials empty until you connect that provider. Start with password login; Google login needs its own OAuth setup.

## 3. Prepare the empty database

Use the database connection from step 2, then run:

```sh
npm run db:migrate
npm run db:seed:defaults
npm run auth:invite-initial-admin
```

The first command creates the tables. The second adds the basic stages and lead sources. The last command prints an activation link for the owner. Open that link privately and choose a password before it expires.

Demo records are optional. Use `npm run db:seed:demo` only in a database reserved for demonstrations. Keep customer records in their own database.

## 4. Start a local copy

```sh
npm run dev
```

Open http://localhost:3000. Sign in with the account you activated. Check that you can add a lead and find it again after refreshing the page.

## 5. Publish the app

On Vercel, import the repository, select Node.js 24, and add the same settings from step 2 to the **Production** environment. Enter the final HTTPS address for the URL settings, then deploy. Keep database preparation as a separate operator step; the build does not create your database tables.

For a Docker server, configure your environment using `.env.docker.example`, then follow DEPLOY_VPS.md. Put HTTPS in front of the app and allow it to reach PostgreSQL.

Before inviting the team, open `/api/health` on your website. It should return `ok: true`. Open the login page, sign in, save a test lead, and confirm it stays after refreshing. Delete the test through the app's normal Trash flow when you finish.

## 6. Set up your business

Open Settings → Industry preset. Select the fields your team needs and apply the preset. Review them under Fields before making anything required.

Set your reporting currency under Region & currency. The app fetches a reference rate when you choose another currency; use your own rate if your business needs one. Original prices and individual target currencies remain visible.

Add your products, then set a target for the right period and currency. Invite staff from Team and check each person's role. Appearance contains your company name, logos and visual settings.

## 7. Set up team messaging and other tools

Inbox is for private direct and group messages between teammates. Invite your team, open Inbox and use **New message** to choose one or more people. You can link a lead when everyone already has permission to view it.

Messaging needs `CRM_INBOX_DATA_KEY`. Generate a separate 32-byte base64 secret with the command in step 2 and store it with your database backups. Inbox no longer connects to a mailbox or sends customer email. Remove any old Inbox email sync job from your scheduler.

For an existing database missing Inbox, run `npm run db:prepare:inbox` as described in docs/INBOX_AND_WORKSPACE_GUIDE.md. It adds the Inbox and guide tables without replaying old migrations.

Integrations shows each tool's setup steps. A saved token means configuration exists. Send a test from the provider and find the captured lead before treating that connection as working.

Yapper can search leads and review their saved notes. It also provides an MCP connection for your own ChatGPT or Claude account. That connection needs your account's support for custom connectors and your consent; installation alone does not connect either service.

## Backups

Schedule PostgreSQL backups with your host and keep a copy outside the app server. Back up the matching Inbox encryption key too. A database backup cannot recover encrypted messages if that key is lost.

Practise restoring a backup into a separate database. Sign in there and check the leads, notes and encrypted conversations before relying on the backup plan. BACKUP_AND_RESTORE.md has the operator commands.

## Common problems

| What you see | What to check |
| --- | --- |
| Build fails immediately | Confirm Node.js 24 and run npm ci with the committed lockfile. Read the first build error. |
| Sign-in loops or callback error | NEXTAUTH_URL must match the HTTPS address people actually use. Redeploy after changing it. |
| Database unavailable | Check the connection string, database status, SSL requirement and network access. |
| Owner activation expired | Run npm run auth:invite-initial-admin again to create a new link. |
| Team messages are unavailable | Check CRM_INBOX_DATA_KEY, migrations and each participant’s current permissions. |
| A guide link opens a missing page | Use Settings → System status → Installation guide. The full guide also lives in INSTALL.md in the repository. |

## Update an existing installation

Back up the database and matching encryption keys first. Read the release's migration notes, rehearse the update on a restored copy, and apply the documented migration command. Build and check the updated copy before switching the live domain.

```sh
git pull
npm ci
npm run verify
```

Historical installations may already have tables without a matching migration ledger. Follow the release's upgrade instructions for that database instead of replaying every old migration. Keep the previous deployment available until sign-in, lead saving, reports and Inbox pass on the new release.
