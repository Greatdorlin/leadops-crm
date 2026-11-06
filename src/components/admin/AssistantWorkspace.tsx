"use client";
import Link from "next/link";
import { ArrowUp, ArrowUpRight, ChartNoAxesColumnIncreasing, Search, PenLine, Settings2, LoaderCircle, ShieldCheck, MessageCircle } from "lucide-react";
import { AssistantPreferences } from "./AssistantPreferences";
import { useEffect, useState, useRef } from "react";
import { AssistantConnectionCard } from "./AssistantConnectionCard";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import { formatCurrencyValue } from "@/lib/currency";
import {
  send,
  type State,
  type Lead,
  type Performance,
} from "./assistant-client";
export function AssistantWorkspace({
  settingsOnly = false,
}: {
  settingsOnly?: boolean;
}) {
  const [data, setData] = useState<State | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [question, setQuestion] = useState(""),
    [leads, setLeads] = useState<Lead[]>([]),
    [report, setReport] = useState<Performance | null>(null),
    [note, setNote] = useState(""),
    [lead, setLead] = useState<Lead | null>(null),
    [composing, setComposing] = useState(false);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const guard = useRef(false);
  const reviewAfterRefresh = useRef(false);
  const noteRequestId = useRef<string | null>(null);
  const settings = useAdminWorkspaceSettings();
  async function refresh() {
    const r = await fetch("/api/assistant", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Assistant is not available yet.");
    setData(d);
    window.dispatchEvent(new Event("assistant:name"));
  }
  useEffect(() => {
    let active = true;
    fetch("/api/assistant", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw new Error(d.error || "Assistant is not available yet.");
        return d;
      })
      .then((d) => {
        if (!active) return;
        setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (reviewAfterRefresh.current && data?.pending.length) {
      document
        .getElementById("review-changes")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      reviewAfterRefresh.current = false;
    }
  }, [data?.pending.length]);
  async function run(action: () => Promise<void>) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function ask() {
    setReport(null);
    setLeads([]);
    setLead(null);
    if (
      /^(?:(?:who|which|what).*(?:perform|staff|team|best)|(?:staff|team|sales) (?:performance|ranking)|show (?:staff|team) performance)/i.test(
        question,
      )
    ) {
      const r = await send({ op: "performance" });
      setReport(r.data);
      return;
    }
    if (/contacted|called|note|payment/i.test(question)) {
      setComposing(true);
      setNote(
        question.replace(
          /^(?:can you (?:help me )?|please )?(?:add|save|record)(?: a)? note(?: that)?[:\s]*/i,
          "",
        ),
      );
      const match = question.match(
        /(?:contacted|called|spoke (?:with|to))\s+([\p{L}'-]+(?:\s+[\p{L}'-]+)?)(?=\s+and|[,.;]|$)/iu,
      );
      if (match) {
        setLeads((await send({ op: "search", query: match[1] })).leads);
      }
      setNotice(
        "Choose the lead below, then review your note. A promise to pay is not a recorded payment.",
      );
      return;
    }
    const query = question
      .replace(/^(find|search(?: for)?|show)\s+(?:leads?\s+)?/i, "")
      .trim();
    if (!query) return;
    const results = (await send({ op: "search", query })).leads;
    setLeads(results);
    setNotice(
      results.length
        ? "Select a lead to prepare a note."
        : "No matching leads found. Try a name or email.",
    );
  }
  if (!data)
    return (
      <div className="admin-surface rounded-3xl p-6">
        <p role={error ? "alert" : "status"}>
          {error || "Loading your assistant…"}
        </p>
        {error ? (
          <button
            className="admin-button-secondary min-h-11 px-4 py-2 mt-3"
            onClick={() => void run(refresh)}
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  return (
    <div className={`mx-auto space-y-6 pb-16 ${settingsOnly ? "max-w-3xl" : "ld-assistant max-w-4xl"}`}>
      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/30 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-2xl bg-white/5 p-4 text-sm">
          {notice}
        </p>
      ) : null}
      {!settingsOnly ? (
        <section className="ld-assistant-workspace">
          <div className="ld-assistant-heading">
            <div className="ld-assistant-identity"><span className="ld-assistant-mark" aria-hidden="true"><MessageCircle className="size-5" /></span><span>{data.name}</span></div>
            <Link className="ld-focus-ring ld-assistant-settings" href="/settings/assistant" aria-label="Assistant settings"><Settings2 className="size-4" /><span>Settings</span></Link>
          </div>
          <div className="ld-assistant-intro">
            <p className="ld-assistant-eyebrow">YOUR WORKSPACE ASSISTANT</p>
            <h2>What’s the next move?</h2>
            <p>Find the right lead. See what’s moving. Keep the next step clear.</p>
          </div>
          {!data.enabled ? (
            <p className="mt-5 rounded-2xl bg-white/5 p-4 text-sm">
              {data.workspace.enabled
                ? "Ask the workspace owner to grant assistant access."
                : "The assistant is turned off for this workspace. You can turn it on in Assistant settings."}
            </p>
          ) : (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(ask);
                }}
                className="ld-assistant-composer"
                aria-busy={busy}
              >
                <label className="sr-only" htmlFor="assistant-question">Ask {data.name}</label>
                <textarea
                  id="assistant-question"
                  ref={questionInput}
                  aria-label={`Ask ${data.name}`}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); if(!busy && question.trim()) void run(ask);}}}
                  maxLength={2000}
                  rows={2}
                  placeholder="Ask about a lead or your team…"
                />
                <div className="ld-assistant-composer-footer">
                  <span><span className="ld-assistant-status-dot" />Connected to your workspace</span>
                  <button className="ld-focus-ring ld-assistant-send" disabled={busy || !question.trim()} aria-label={`Ask ${data.name}`}>
                    {busy ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
                  </button>
                </div>
              </form>
              {busy ? <p role="status" className="mt-3 text-sm text-white/60">Working on your request…</p> : null}
              <div className="ld-assistant-shortcuts" aria-label="Suggested actions">
                {data.canReport ? <button disabled={busy} onClick={() => void run(async () => {setComposing(false);setLeads([]);setReport((await send({op:"performance"})).data);})}><ChartNoAxesColumnIncreasing /><span>Team performance</span><ArrowUpRight /></button> : null}
                <button type="button" disabled={busy} onClick={() => {setQuestion("Find ");questionInput.current?.focus();}}><Search /><span>Find a lead</span><ArrowUpRight /></button>
                {data.canWrite ? <button type="button" disabled={busy} onClick={() => {setComposing(true);setReport(null);}}><PenLine /><span>Add a note</span><ArrowUpRight /></button> : null}
              </div>
              <p className="ld-assistant-assurance"><ShieldCheck className="size-3.5" />Changes wait for your approval.</p>
              {report ? (
                <div className="mt-5 space-y-3">
                  <h3 className="font-semibold">
                    Staff performance · won revenue
                  </h3>
                  <p className="text-xs text-white/60">
                    All time · {report.scope}. This ranks sales outcomes, not
                    individual potential.
                  </p>
                  {report.staff.length ? (
                    report.staff.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-4"
                      >
                        <p>
                          {i + 1}. {r.label}
                        </p>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrencyValue(
                              r.wonValue,
                              settings.globalCurrency,
                            )}
                          </p>
                          <p className="text-xs text-white/60">
                            {r.wonLeads} won · {r.assignedLeads} assigned
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/60">
                      No assigned sales outcomes in your reporting scope yet.
                    </p>
                  )}
                </div>
              ) : null}
              {leads.length ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {leads.map((l) => (
                    <button
                      key={l.id}
                      className="admin-button-secondary min-h-11 px-4 py-2 justify-start text-left"
                      onClick={() => {
                        setLead(l);
                        setComposing(data.canWrite);
                        noteRequestId.current = null;
                      }}
                    >
                      {l.name}
                      {l.company ? (
                        <span className="ml-2 truncate text-xs text-white/60">
                          {l.company}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {data.canWrite && composing ? (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="font-semibold">Add a contact note</h3>
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      void run(async () => {
                        setLeads(
                          (
                            await send({
                              op: "search",
                              query: String(form.get("leadSearch")),
                            })
                          ).leads,
                        );
                        setLead(null);
                      });
                    }}
                  >
                    <input
                      className="admin-input min-h-11 px-3 py-2 min-w-0 flex-1"
                      name="leadSearch"
                      aria-label="Find lead for note"
                      required
                      placeholder="Lead name or email"
                      maxLength={200}
                    />
                    <button
                      disabled={busy}
                      className="admin-button-secondary min-h-11 px-4 py-2"
                    >
                      Find lead
                    </button>
                  </form>
                  {lead ? (
                    <p className="mt-3 text-sm">
                      Note for{" "}
                      <Link className="underline" href={`/leads/${lead.id}`}>
                        {lead.name}
                      </Link>
                    </p>
                  ) : null}
                  <textarea
                    aria-label="Contact note"
                    className="admin-input min-h-11 px-3 py-2 mt-3 w-full"
                    rows={3}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      noteRequestId.current = null;
                    }}
                    maxLength={2000}
                    placeholder="I contacted Mathew. He said he will make his payment next week."
                  />
                  <button
                    className="admin-button-primary min-h-11 px-4 py-2 mt-3"
                    disabled={busy || !lead || note.trim().length < 2}
                    onClick={() =>
                      void run(async () => {
                        noteRequestId.current ??= crypto.randomUUID();
                        await send({
                          op: "propose",
                          payload: {
                            requestId: noteRequestId.current,
                            action: { kind: "note", leadId: lead!.id, note },
                          },
                        });
                        noteRequestId.current = null;
                        setNote("");
                        setLead(null);
                        setComposing(false);
                        reviewAfterRefresh.current = true;
                        await refresh();
                        setNotice("Your note is ready for approval below.");
                      })
                    }
                  >
                    Review note
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
      {data.enabled && data.pending.length ? (
        <section
          className="admin-surface scroll-mt-24 rounded-3xl p-5"
          id="review-changes"
        >
          <h2 className="text-xl font-semibold">Review proposed changes</h2>
          <p className="mt-2 text-sm text-white/60">
            Only you can approve your proposals. Each request expires after 15
            minutes.
          </p>
          <div className="mt-4 space-y-3">
            {data.pending.map((p) => (
              <article
                className="rounded-2xl border border-white/10 p-4"
                key={p.id}
              >
                <p className="text-sm font-semibold capitalize">
                  {p.action.kind} · {p.targetName}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {p.action.note || p.action.title || p.action.priority}
                </p>
                <Link
                  className="mt-2 inline-block text-sm underline"
                  href={`/leads/${p.action.leadId}`}
                >
                  Review target lead
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    className="admin-button-primary min-h-11 px-4 py-2"
                    onClick={() =>
                      void run(async () => {
                        await send({ op: "review", id: p.id, approve: true });
                        await refresh();
                        setNotice("Change saved to the lead.");
                      })
                    }
                  >
                    Approve and save
                  </button>
                  <button
                    disabled={busy}
                    className="admin-button-secondary min-h-11 px-4 py-2"
                    onClick={() =>
                      void run(async () => {
                        await send({ op: "review", id: p.id, approve: false });
                        await refresh();
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {settingsOnly ? (
        <AssistantPreferences
          key={`${data.personalName}:${data.workspace.name}:${data.workspace.nameLocked}`}
          data={data}
          busy={busy}
          run={run}
          refresh={refresh}
          setNotice={setNotice}
        />
      ) : null}
      {!settingsOnly && data.enabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
          <Link
            href="/settings/assistant#connect-ai"
            className="underline underline-offset-4"
          >
            Connect ChatGPT or Claude
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(refresh)}
            className="min-h-11 underline underline-offset-4"
          >
            Refresh proposals
          </button>
        </div>
      ) : null}
      {settingsOnly ? (
        <AssistantConnectionCard
          data={data}
          busy={busy}
          run={run}
          refresh={refresh}
        />
      ) : null}
    </div>
  );
}
