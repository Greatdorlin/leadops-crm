"use client";
import Link from "next/link";
import { leadSearchQuery } from "@/lib/assistant/search-query";
import { questionIntent } from "@/lib/assistant/question-intent";
import type { objections } from "@/lib/assistant/objections";
import {
  ArrowUp,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  Search,
  PenLine,
  Settings2,
  LoaderCircle,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
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
    [objectionReport, setObjectionReport] = useState<Awaited<
      ReturnType<typeof objections>
    > | null>(null),
    [note, setNote] = useState(""),
    [lead, setLead] = useState<Lead | null>(null),
    [composing, setComposing] = useState(false);
  const [noteSearchStatus, setNoteSearchStatus] = useState("");
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const noteComposer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!composing) return;
    noteComposer.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    noteComposer.current
      ?.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(lead ? "textarea" : "input")
      ?.focus({ preventScroll: true });
  }, [composing, lead]);
  useEffect(() => {
    if (composing || (!report && !objectionReport && !notice)) return;
    answerRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    answerRef.current?.focus({ preventScroll: true });
  }, [report, objectionReport, notice, composing]);
  const guard = useRef(false);
  const reviewAfterRefresh = useRef(false);
  const noteRequestId = useRef<string | null>(null);
  const settings = useAdminWorkspaceSettings();
  async function refresh() {
    const r = await fetch("/api/assistant", { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Assistant is not available yet.");
    setData(d);
    window.dispatchEvent(new Event("assistant:name"));
  }
  useEffect(() => {
    let active = true;
    fetch("/api/assistant", { cache: "no-store", signal: AbortSignal.timeout(20000) })
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
    setObjectionReport(null);
    setComposing(false);
    const intent = questionIntent(question);
    if (intent === "objections" || intent === "notes") {
      setObjectionReport((await send({ op: "objections", question })).data);
      return;
    }
    if (intent === "performance") {
      const r = await send({ op: "performance" });
      setReport(r.data);
      return;
    }
    if (intent === "note") {
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
        const found = (await send({ op: "search", query: match[1] })).leads;
        setLeads(found);
        setNoteSearchStatus(found.length ? "Choose the lead for this note." : `No lead matching “${match[1]}” was found. Search again below.`);
      }
      setNotice(
        "Choose the lead below, then review your note. A promise to pay is not a recorded payment.",
      );
      return;
    }
    if (intent === "unsupported") {
      setNotice(
        "Try a lead’s name, ask what customers are saying, or ask about price objections this month. You can also prepare a note for approval. Open-ended AI questions use your connected ChatGPT or Claude account.",
      );
      return;
    }
    const query = leadSearchQuery(question);
    if (query.length < 2) {
      setNotice("Enter the lead’s name, email address, or company. For example: Find Jordan Ellis.");
      return;
    }
    const results = (await send({ op: "search", query })).leads;
    setLeads(results);
    setNotice(
      results.length
        ? "Choose a lead to open its record."
        : `No lead matching “${query}” was found in your access scope.`,
    );
  }
  if (!data)
    return (
      <div className="admin-surface rounded-3xl p-6">
        <p role={error ? "alert" : "status"}>
          {error || "Connecting to your workspace"}
        </p>
        {!error ? (
          <div aria-hidden="true" className="mt-6 space-y-4">
            <div className="h-8 w-2/3 rounded-lg bg-white/8" />
            <div className="h-36 rounded-2xl border border-white/10 bg-white/5" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 rounded-lg bg-white/5" />
              ))}
            </div>
          </div>
        ) : null}
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
    <div
      className={`mx-auto space-y-6 pb-16 ${settingsOnly ? "max-w-3xl" : "ld-assistant max-w-4xl"}`}
    >
      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/30 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {!settingsOnly ? (
        <section className="ld-assistant-workspace">
          <div className="ld-assistant-heading">
            <div className="ld-assistant-identity">
              <span className="ld-assistant-mark" aria-hidden="true">
                <MessageCircle className="size-5" />
              </span>
              <span>{data.name}</span>
            </div>
            <Link
              className="ld-focus-ring ld-assistant-settings"
              href="/settings/assistant"
              aria-label="Assistant settings"
            >
              <Settings2 className="size-4" />
              <span>Settings</span>
            </Link>
          </div>
          <div className="ld-assistant-intro">
            <p className="ld-assistant-eyebrow">YOUR WORKSPACE ASSISTANT</p>
            <h2>What’s the next move?</h2>
            <p>
              Find the right lead. See what’s moving. Keep the next step clear.
            </p>
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
                <label className="sr-only" htmlFor="assistant-question">
                  Ask {data.name}
                </label>
                <textarea
                  id="assistant-question"
                  ref={questionInput}
                  aria-label={`Ask ${data.name}`}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      if (!busy && question.trim()) void run(ask);
                    }
                  }}
                  maxLength={2000}
                  rows={2}
                  placeholder="Ask about a lead or your team…"
                />
                <div className="ld-assistant-composer-footer">
                  <span>
                    <span className="ld-assistant-status-dot" />
                    Connected to your workspace
                  </span>
                  <button
                    className="ld-focus-ring ld-assistant-send"
                    disabled={busy || !question.trim()}
                    aria-label={`Ask ${data.name}`}
                  >
                    {busy ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <ArrowUp className="size-5" />
                    )}
                  </button>
                </div>
              </form>
              {busy ? (
                <p role="status" className="mt-3 text-sm text-white/60">
                  Working on your request…
                </p>
              ) : null}
              <div
                className="ld-assistant-shortcuts"
                aria-label="Suggested actions"
                style={{
                  gridTemplateColumns: `repeat(${1 + Number(data.canReport) + Number(data.canWrite)}, minmax(0,1fr))`,
                }}
              >
                {data.canReport ? (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        setComposing(false);
                        setObjectionReport(null);
                        setLeads([]);
                        setReport((await send({ op: "performance" })).data);
                      })
                    }
                  >
                    <ChartNoAxesColumnIncreasing />
                    <span>Team performance</span>
                    <ArrowUpRight />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setComposing(false);
                    setLead(null);
                    setLeads([]);
                    setNotice("");
                    setReport(null);
                    setObjectionReport(null);
                    setQuestion("Find ");
                    questionInput.current?.focus();
                  }}
                >
                  <Search />
                  <span>Find a lead</span>
                  <ArrowUpRight />
                </button>
                {data.canWrite ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setComposing(true);
                      setReport(null);
                    }}
                  >
                    <PenLine />
                    <span>Add a note</span>
                    <ArrowUpRight />
                  </button>
                ) : null}
              </div>
              <p className="ld-assistant-assurance">
                <ShieldCheck className="size-3.5" />
                Changes wait for your approval.
              </p>
              <div
                ref={answerRef}
                tabIndex={-1}
                className="scroll-mt-24 outline-none"
              >
                {notice ? <p role="status" className="rounded-xl bg-white/5 p-4 text-sm leading-6">{notice}</p> : null}
                {objectionReport ? (
                  <section
                    className="mt-6 space-y-4"
                    aria-label="Sales objections"
                  >
                    <h3 className="font-semibold">
                      Sales notes and objections
                    </h3>
                    <p role="status" className="mt-3 text-base leading-7">{objectionReport.answer}</p>
                    <p className="mt-2 text-sm text-white/65">
                      {objectionReport.period} · {objectionReport.scannedNotes} notes reviewed ·{" "}
                      {objectionReport.scope}. {objectionReport.method}
                    </p>
                    {objectionReport.themes.length ? (
                      objectionReport.themes.map((theme) => (
                        <div
                          key={theme.key}
                          className="border-t border-white/10 pt-4"
                        >
                          <h4 className="font-medium">
                            {theme.label}{" "}
                            <span className="text-sm text-white/60">
                              · {theme.leadCount} {theme.leadCount === 1 ? "lead" : "leads"} · {theme.noteCount}{" "}
                              {theme.noteCount === 1 ? "note" : "notes"}
                            </span>
                          </h4>
                          <ul className="mt-2 space-y-3">
                            {theme.evidence.map((note) => (
                              <li key={note.id} className="text-sm">
                                <p className="whitespace-pre-wrap break-words text-white/75">
                                  “{note.excerpt}”
                                </p>
                                <Link
                                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                                  href={`/leads/${note.leadId}`}
                                >
                                  {note.name} · View notes
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : null}
                    <details className="mt-4 border-t border-white/10 pt-4" open={!objectionReport.themes.length}>
                      <summary className="cursor-pointer text-sm font-medium">Matching notes ({objectionReport.evidence.length})</summary>
                      <ul className="mt-3 space-y-4">{objectionReport.evidence.map(n=><li key={n.id} className="border-b border-white/10 pb-3"><Link href={`/leads/${n.leadId}`} className="inline-flex min-h-11 items-center underline">{n.name} · View lead</Link><p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{n.excerpt}</p><time className="mt-2 block text-xs text-white/50">{new Date(n.createdAt).toLocaleDateString()}</time></li>)}</ul>
                    </details>
                  </section>
                ) : null}
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
              </div>
              {leads.length && !composing ? (
                <div className="mt-6 divide-y divide-white/10">
                  {leads.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <Link
                        className="ld-focus-ring min-w-0 flex-1 rounded-md py-2"
                        href={`/leads/${l.id}`}
                      >
                        <span className="block text-sm font-medium">
                          {l.name}
                        </span>
                        {l.company ? (
                          <span className="block truncate text-xs text-white/55">
                            {l.company}
                          </span>
                        ) : null}
                      </Link>
                      {data.canWrite ? (
                        <button
                          className="admin-button-secondary min-h-11 shrink-0 px-3 text-xs"
                          onClick={() => {
                            setLead(l);
                            setComposing(true);
                            noteRequestId.current = null;
                          }}
                        >
                          Add note
                        </button>
                      ) : (
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 text-white/40"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
              {data.canWrite && composing ? (
                <div
                  ref={noteComposer}
                  className="mt-6 scroll-mt-24 border-t border-white/10 pt-5"
                >
                  <h3 className="font-semibold">Add a contact note</h3>
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      void run(async () => {
                        const query = leadSearchQuery(String(form.get("leadSearch")));
                        const found = (await send({op:"search",query})).leads;
                        setLeads(found);
                        setLead(null);
                        setNoteSearchStatus(found.length ? "Choose the lead for this note." : `No lead matching “${query}” was found. Try another name or email.`);
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
                  {noteSearchStatus ? <p role="status" className="mt-3 text-sm leading-6">{noteSearchStatus}</p> : null}
                  {leads.length && !lead ? (
                    <div className="mt-3 divide-y divide-white/10">
                      {leads.map((l) => (
                        <button
                          key={l.id}
                          className="ld-focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-md py-3 text-left text-sm"
                          onClick={() => {
                            setLead(l);
                            noteRequestId.current = null;
                          }}
                        >
                          <span>
                            {l.name}
                            {l.company ? (
                              <span className="ml-2 text-xs text-white/55">
                                {l.company}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs text-white/55">
                            Use for note
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
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
            Check pending changes
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
