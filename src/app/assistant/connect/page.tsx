import Link from "next/link";
import { requireAdminSession, getAdminRequestContext } from "@/lib/admin";
import { authorizationRequest } from "@/lib/assistant/oauth";
import { sessionActor } from "@/lib/assistant/access";
export const dynamic = "force-dynamic";
export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(raw))
    if (typeof v === "string") p.set(k, v);
  await requireAdminSession(`/assistant/connect?${p}`);
  const authorized = await Promise.all([
    authorizationRequest(p),
    getAdminRequestContext(),
    sessionActor(),
  ]).catch(() => null);
  if (!authorized)
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl">Connection unavailable</h1>
        <p className="my-4">
          Ask the workspace owner for assistant access, or return to your AI
          tool and reconnect.
        </p>
        <Link href="/assistant">Back to Leads Desk</Link>
      </main>
    );
  const [req, context, actor] = authorized;
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <section className="admin-surface rounded-3xl p-6 text-white">
        <p className="text-sm text-white/60">
          Leads Desk · Personal connection
        </p>
        <h1 className="my-4 break-words text-2xl font-semibold">
          Connect {req.client.name}?
        </h1>
        <p className="break-words text-sm text-white/70">
          Signed in as {context?.session.user?.email}. This tool will only see
          CRM data your account can access.
        </p>
        <p className="my-4 break-all text-xs text-white/60">
          Callback: {new URL(req.redirectUri).origin}
        </p>
        <p className="text-sm">
          This is an external AI tool. Data you ask it to retrieve will be sent
          to that service.
        </p>
        <form
          action="/api/assistant/oauth/authorize"
          method="post"
          className="mt-5 space-y-5"
        >
          {[...p]
            .filter(([key]) =>
              [
                "client_id",
                "redirect_uri",
                "response_type",
                "resource",
                "code_challenge",
                "code_challenge_method",
                "scope",
                "state",
              ].includes(key),
            )
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          {req.scope.includes("crm:write") && actor.canWrite ? (
            <label className="flex gap-3 text-sm">
              <input type="checkbox" name="allow_write" value="yes" />
              Allow proposed changes. I will review them in Leads Desk before
              they are applied.
            </label>
          ) : null}
          <div className="flex gap-3">
            <button
              className="admin-button-primary min-h-11 px-4 py-2"
              type="submit"
            >
              Connect my account
            </button>
            <Link
              href="/assistant"
              className="admin-button-secondary min-h-11 px-4 py-2"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
