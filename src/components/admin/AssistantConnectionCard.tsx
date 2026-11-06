"use client";
import { CopyButton } from "./CopyButton";
import { send, type State } from "./assistant-client";
export function AssistantConnectionCard({
  data,
  busy,
  run,
  refresh,
}: {
  data: State;
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  return (
    <section
      className="admin-surface scroll-mt-24 rounded-3xl p-5"
      id="connect-ai"
    >
      <h2 className="text-xl font-semibold">Connect your AI tool</h2>
      <p className="mt-2 text-sm text-white/65">
        Add this MCP URL in your tool’s connector settings and choose OAuth.
        Sign in to Leads Desk as yourself. Your AI tool’s own plan and limits
        apply.
      </p>
      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3 rounded-2xl bg-white/5 p-3">
        <code className="min-w-0 flex-1 break-all text-sm">{data.mcpUrl}</code>
        <CopyButton text={data.mcpUrl} />
      </div>
      <p className="mt-3 text-xs text-white/55">
        No shared owner key. Access and permissions are rechecked on every
        request. AI changes require your approval here.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="https://chatgpt.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-button-secondary min-h-11 px-4 py-2"
        >
          Open ChatGPT
        </a>
        <a
          href="https://claude.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-button-secondary min-h-11 px-4 py-2"
        >
          Open Claude
        </a>
      </div>
      {data.connections.map((c) => (
        <div
          key={c.familyId}
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 p-3"
        >
          <p className="text-sm [overflow-wrap:anywhere]">
            {c.clientName} · expires{" "}
            {new Date(c.expiresAt).toLocaleDateString()}
          </p>
          <button
            className="admin-button-secondary min-h-11 px-4 py-2"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await send({ op: "disconnect", familyId: c.familyId });
                await refresh();
              })
            }
          >
            Disconnect
          </button>
        </div>
      ))}
    </section>
  );
}
