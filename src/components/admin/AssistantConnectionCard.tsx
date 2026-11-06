"use client";
import { useEffect, useRef } from "react";
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
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function revealConnection() {
      if (window.location.hash !== "#connect-ai" || !disclosure.current) return;
      disclosure.current.open = true;
      disclosure.current.scrollIntoView({ block: "start", behavior: "auto" });
    }
    const frame = requestAnimationFrame(revealConnection);
    window.addEventListener("hashchange", revealConnection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealConnection);
    };
  }, []);
  return (
    <details
      ref={disclosure}
      className="admin-surface scroll-mt-24 rounded-3xl p-5"
      id="connect-ai"
    >
      <summary className="cursor-pointer text-lg font-semibold">
        Connect ChatGPT, Claude or another AI tool
      </summary>
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
    </details>
  );
}
