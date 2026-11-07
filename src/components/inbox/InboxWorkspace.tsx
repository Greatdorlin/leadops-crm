"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  LockKeyhole,
  Search,
  Hash,
  MessageCircle,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ComposeConversation } from "./ComposeConversation";
import {
  inboxRequest,
  type Conversation,
  type Directory,
  type Thread,
} from "./client";
export function InboxWorkspace() {
  const router = useRouter();
  const [directory, setDirectory] = useState<Directory | null>(null),
    [threads, setThreads] = useState<Thread[]>([]),
    [next, setNext] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [conversation, setConversation] = useState<Conversation | null>(null),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [compose, setCompose] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | "unread" | "groups">("all"),
    [initialLead, setInitialLead] = useState<string | undefined>(),
    [sharing, setSharing] = useState(false),
    [teammate, setTeammate] = useState("");
  const newButton = useRef<HTMLButtonElement>(null),
    activeThread = useRef<string | null>(null),
    guard = useRef(false),
    requestKey = useRef<{ text: string; threadId: string; id: string } | null>(
      null,
    ),
    bottom = useRef<HTMLDivElement>(null),
    freshLoad = useRef(false);
  const loadList = useCallback(async () => {
    const d = await inboxRequest<{ threads: Thread[]; next: string | null }>();
    setThreads(d.threads);
    setNext(d.next);
  }, []);
  const loadConversation = useCallback(async (id: string) => {
    let d: Conversation;
    try {
      d = await inboxRequest<Conversation>(`?threadId=${id}`);
    } catch (error) {
      if (
        [401, 403, 404, 410].includes((error as { status?: number }).status ?? 0) &&
        activeThread.current === id
      ) {
        activeThread.current = null;
        setSelected(null);
        setConversation(null);
        setThreads((rows) => rows.filter((t) => t.id !== id));
        setError("This conversation is no longer available to your account.");
      }
      throw error;
    }
    if (activeThread.current !== id) return;
    setConversation(d);
    if (document.visibilityState === "visible") {
      await inboxRequest("", {
        op: "read",
        threadId: id,
        through: d.seenThrough,
      });
      setThreads((rows) =>
        rows.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
      );
    }
  }, []);
  useLayoutEffect(() => {
    if (conversation && freshLoad.current) {
      freshLoad.current = false;
      bottom.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [conversation]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.all([
      inboxRequest<Directory>("?op=directory", undefined, controller.signal),
      inboxRequest<{ threads: Thread[]; next: string | null }>(
        "",
        undefined,
        controller.signal,
      ),
    ])
      .then(([d, list]) => {
        if (!active) return;
        setDirectory(d);
        setThreads(list.threads);
        setNext(list.next);
        const q = new URLSearchParams(window.location.search),
          id = q.get("thread"),
          leadId = q.get("leadId");
        if (id && /^[0-9a-f-]{36}$/i.test(id)) {
          activeThread.current = id;
          setSelected(id);
          freshLoad.current = true;
          void loadConversation(id).catch((e) => setError(e.message));
        }
        if (leadId && /^[0-9a-f-]{36}$/i.test(leadId)) {
          setInitialLead(leadId);
          setCompose(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadConversation]);

  useEffect(() => {
    let active = true,
      pending = false;
    async function update() {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const list = await inboxRequest<{
          threads: Thread[];
          next: string | null;
        }>();
        if (!active) return;
        setThreads(list.threads);
        setNext(list.next);
        if (activeThread.current) await loadConversation(activeThread.current);
      } catch (error) {
        if ([401, 403].includes((error as { status?: number }).status ?? 0)) {
          activeThread.current = null;
          setSelected(null);
          setConversation(null);
          setThreads([]);
          setDirectory(null);
          setError(
            "Inbox access is no longer available. Sign in again with your own account.",
          );
        }
      } finally {
        pending = false;
      }
    }
    const interval = setInterval(() => void update(), 15000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [loadConversation]);
  function open(id: string) {
    activeThread.current = id;
    setSelected(id);
    setConversation(null);
    freshLoad.current = true;
    void loadConversation(id).catch((e) => setError(e.message));
    setText("");
    requestKey.current = null;
    setSharing(false);
    setError("");
    router.replace(`/inbox?thread=${id}`, { scroll: false });
  }
  function back() {
    activeThread.current = null;
    setSelected(null);
    setConversation(null);
    setSharing(false);
    router.replace("/inbox", { scroll: false });
  }
  async function send() {
    if (guard.current || !selected || !text.trim()) return;
    guard.current = true;
    setBusy(true);
    setError("");
    const id = selected;
    try {
      if (
        requestKey.current?.text !== text ||
        requestKey.current.threadId !== id
      )
        requestKey.current = { text, threadId: id, id: crypto.randomUUID() };
      await inboxRequest("", {
        op: "send",
        threadId: id,
        requestId: requestKey.current.id,
        text,
      });
      if (activeThread.current === id) setText("");
      requestKey.current = null;
      freshLoad.current = true;
      await Promise.all([loadConversation(id), loadList()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message was not sent.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function share(ids: string[]) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await inboxRequest("", {
        op: "participants",
        threadId: selected,
        participantIds: ids,
      });
      setTeammate("");
      await loadConversation(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Access could not be updated.");
    } finally {
      setBusy(false);
    }
  }
  const shown = threads.filter(
    (t) =>
      t.subject.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "unread" ? t.unread > 0 : t.memberCount > 2)),
  );
  async function moreThreads() {
    if (!next) return;
    try {
      const d = await inboxRequest<{ threads: Thread[]; next: string | null }>(
        `?before=${next}`,
      );
      setThreads((rows) => [
        ...rows,
        ...d.threads.filter((t) => !rows.some((r) => r.id === t.id)),
      ]);
      setNext(d.next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load conversations.",
      );
    }
  }
  async function earlier() {
    if (!conversation?.next || !selected) return;
    try {
      const d = await inboxRequest<Conversation>(
        `?threadId=${selected}&before=${conversation.next}`,
      );
      setConversation((c) =>
        c && c.thread.id === d.thread.id
          ? {
              ...c,
              next: d.next,
              messages: [
                ...d.messages,
                ...c.messages.filter(
                  (m) => !d.messages.some((n) => n.id === m.id),
                ),
              ],
            }
          : c,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages.");
    }
  }
  return (
    <div className="space-y-3" data-tour="team-inbox">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/25 p-3 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {directory && !directory.secure ? (
        <p
          role="status"
          className="rounded-xl border border-white/10 p-4 text-sm text-white/65"
        >
          Secure messaging needs an encryption key. Ask your workspace owner to
          finish setup.
        </p>
      ) : null}
      <div className="grid min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[var(--ld-color-background)] shadow-xl md:h-[min(740px,calc(100dvh-210px))] md:min-h-[520px] md:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`${selected ? "hidden md:flex" : "flex"} min-h-[440px] min-w-0 flex-col border-white/10 bg-white/[.025] md:border-r`}
          aria-label="Conversations"
        >
          <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Messages</h2>
              <p className="mt-1 text-xs text-white/45">
                Your team, one conversation away.
              </p>
            </div>
            <button
              ref={newButton}
              aria-label="New message"
              title="New message"
              className="admin-button-primary flex size-10 shrink-0 items-center justify-center rounded-xl"
              disabled={!directory?.secure}
              onClick={() => {
                setInitialLead(undefined);
                setCompose(true);
              }}
            >
              <Plus className="size-5" />
            </button>
          </header>
          <div className="px-3 pb-3">
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3">
              <Search className="size-4 shrink-0 text-white/40" />
              <input
                className="w-full min-w-0 bg-transparent py-2 text-sm outline-none"
                aria-label="Search loaded conversations"
                placeholder="Find a conversation"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div
            className="flex gap-1 border-b border-white/10 px-3 pb-3"
            role="group"
            aria-label="Filter conversations"
          >
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["groups", "Groups"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={`min-h-9 rounded-lg px-3 text-xs font-medium ${filter === value ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[62dvh] min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 md:max-h-none">
            {loading ? (
              <p role="status" className="p-4 text-sm text-white/55">
                Loading messages…
              </p>
            ) : shown.length ? (
              shown.map((t) => (
                <button
                  key={t.id}
                  aria-current={selected === t.id ? "true" : undefined}
                  onClick={() => open(t.id)}
                  className={`ld-focus-ring mb-1 flex min-h-20 w-full min-w-0 gap-3 rounded-xl p-3 text-left transition hover:bg-white/5 ${selected === t.id ? "bg-white/10 ring-1 ring-white/10" : ""}`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.memberCount > 2 ? "bg-violet-400/10 text-violet-200" : "bg-sky-400/10 text-sky-200"}`}
                  >
                    {t.memberCount > 2 ? (
                      <Hash className="size-4" />
                    ) : (
                      <MessageCircle className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${t.unread ? "font-semibold" : "font-medium"}`}
                    >
                      {t.subject}
                    </span>
                    <span className="mt-1 block text-xs text-white/45">
                      {t.memberCount > 2
                        ? `${t.memberCount} members`
                        : "Direct message"}{" "}
                      ·{" "}
                      {new Date(t.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </span>
                  {t.unread > 0 ? (
                    <span
                      aria-label={`${t.unread} unread messages`}
                      className="mt-1 h-fit rounded-md bg-[var(--ld-color-primary)] px-1.5 py-0.5 text-[11px] font-semibold"
                    >
                      {t.unread > 99 ? "99+" : t.unread}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="p-5 text-center">
                <MessageCircle className="mx-auto mb-3 size-6 text-white/25" />
                <p className="text-sm font-medium">
                  {filter === "unread"
                    ? "You’re all caught up"
                    : query
                      ? "No matching conversations"
                      : filter === "groups"
                        ? "No group conversations yet"
                        : "Start with a message"}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  {query
                    ? "Search covers the conversations loaded here. Load older conversations to find more."
                    : filter === "unread"
                      ? "New unread messages will appear here."
                      : "Use + to bring the right people together."}
                </p>
              </div>
            )}
            {next ? (
              <button
                className="min-h-11 w-full text-xs text-white/60 underline"
                onClick={() => void moreThreads()}
              >
                Load older conversations
              </button>
            ) : null}
          </div>
          <footer className="flex items-center gap-2 border-t border-white/10 p-4 text-[11px] text-white/40">
            <LockKeyhole className="size-3.5 shrink-0" />
            Private team conversations
            <button
              aria-label="Refresh conversations"
              title="Refresh"
              className="ml-auto grid size-8 place-items-center rounded-md hover:bg-white/5"
              onClick={() => void loadList().catch((e) => setError(e.message))}
            >
              <RefreshCw className="size-3.5" />
            </button>
          </footer>
        </aside>
        <section
          className={`${selected ? "flex" : "hidden md:flex"} min-h-[520px] min-w-0 flex-col`}
          aria-label="Conversation"
        >
          {!selected ? (
            <div className="grid flex-1 place-items-center px-8 py-16">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Users className="size-7 text-white/60" />
                </div>
                <p className="text-xs font-medium uppercase tracking-[.15em] text-white/40">
                  Better together
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  Keep the conversation moving.
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  Ask a teammate, share a lead handoff, or bring a small group
                  together. Your conversations stay with the people you choose.
                </p>
                <button
                  className="admin-button-primary mt-6 min-h-11 px-5 text-sm"
                  disabled={!directory?.secure}
                  onClick={() => setCompose(true)}
                >
                  <Plus className="mr-2 size-4" />
                  New message
                </button>
              </div>
            </div>
          ) : !conversation ? (
            <div role="status" className="p-6 text-sm text-white/60">
              Opening conversation…
              <button className="ml-3 underline" onClick={back}>
                Back
              </button>
            </div>
          ) : (
            <>
              <header className="flex min-w-0 items-center gap-3 border-b border-white/10 px-4 py-4">
                <button
                  aria-label="Back to conversations"
                  className="admin-button-ghost grid size-10 shrink-0 place-items-center md:hidden"
                  onClick={back}
                >
                  <ArrowLeft className="size-5" />
                </button>
                <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-white/5 sm:grid">
                  <Hash className="size-5 text-white/60" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold">
                    {conversation.thread.subject}
                  </h2>
                  <p className="mt-1 truncate text-xs text-white/45">
                    {conversation.thread.members
                      .map((m) =>
                        m.id === directory?.currentUserId
                          ? "You"
                          : m.name || m.email,
                      )
                      .join(", ")}
                  </p>
                </div>
                <button
                  className="admin-button-ghost flex min-h-10 shrink-0 items-center gap-2 px-2 text-xs"
                  aria-expanded={sharing}
                  onClick={() => setSharing((v) => !v)}
                >
                  <Users className="size-4" />
                  {conversation.thread.members.length}
                  <span className="hidden sm:inline">Members</span>
                </button>
              </header>
              {conversation.thread.leadId ? (
                <div className="border-b border-white/10 px-5 py-2">
                  <Link
                    className="text-xs text-white/60 underline underline-offset-4"
                    href={`/leads/${conversation.thread.leadId}`}
                  >
                    Open linked lead ↗
                  </Link>
                </div>
              ) : null}
              {sharing && directory ? (
                <div className="max-h-60 space-y-2 overflow-y-auto border-b border-white/10 bg-white/[.025] p-4 text-sm">
                  <p className="mb-2 text-xs text-white/50">
                    Only these people can read this conversation.
                  </p>
                  {conversation.thread.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 break-words">
                        {m.name || m.email}
                        {m.id === directory.currentUserId ? " (you)" : ""}
                      </span>
                      {conversation.thread.canManageParticipants &&
                      m.id !== directory.currentUserId ? (
                        <button
                          className="min-h-10 shrink-0 text-xs text-white/60 underline"
                          disabled={busy}
                          onClick={() =>
                            void share(
                              conversation.thread.members
                                .filter((x) => x.id !== m.id)
                                .map((x) => x.id),
                            )
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {conversation.thread.canManageParticipants ? (
                    <div className="flex min-w-0 gap-2 pt-2">
                      <AdminSelect
                        aria-label="Add teammate to conversation"
                        className="min-h-11 min-w-0 flex-1"
                        value={teammate}
                        onChange={(e) => setTeammate(e.target.value)}
                      >
                        <option value="">Choose a teammate</option>
                        {directory.users
                          .filter(
                            (u) =>
                              !conversation.thread.members.some(
                                (m) => m.id === u.id,
                              ),
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name || u.email}
                            </option>
                          ))}
                      </AdminSelect>
                      <button
                        className="admin-button-secondary min-h-11 px-3"
                        disabled={busy || !teammate}
                        onClick={() =>
                          void share([
                            ...conversation.thread.members.map((m) => m.id),
                            teammate,
                          ])
                        }
                      >
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                className="max-h-[55dvh] min-h-48 flex-1 overflow-y-auto overscroll-contain py-4 md:max-h-none"
                aria-label="Messages"
              >
                {conversation.next ? (
                  <button
                    className="min-h-11 w-full text-xs text-white/55 underline"
                    onClick={() => void earlier()}
                  >
                    Load earlier messages
                  </button>
                ) : null}
                {conversation.messages.map((m, index) => {
                  const prior = conversation.messages[index - 1];
                  const day = new Date(m.createdAt).toLocaleDateString(
                    undefined,
                    { weekday: "short", month: "short", day: "numeric" },
                  );
                  const newDay =
                    !prior ||
                    new Date(prior.createdAt).toDateString() !==
                      new Date(m.createdAt).toDateString();
                  return (
                    <div key={m.id}>
                      {newDay ? (
                        <div className="my-4 flex items-center gap-3 px-5">
                          <span className="h-px flex-1 bg-white/10" />
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50">
                            {day}
                          </span>
                          <span className="h-px flex-1 bg-white/10" />
                        </div>
                      ) : null}
                      <article className="flex gap-3 px-4 py-2.5 hover:bg-white/[.025] sm:px-5">
                        <span
                          aria-hidden="true"
                          className={`grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold ${m.own ? "bg-violet-400/15 text-violet-200" : "bg-sky-400/15 text-sky-200"}`}
                        >
                          {m.author
                            .split(/\s+/)
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="text-sm font-semibold">
                              {m.author}
                              {m.own ? (
                                <span className="ml-1 font-normal text-white/40">
                                  you
                                </span>
                              ) : null}
                            </p>
                            <time
                              dateTime={m.createdAt}
                              className="text-[11px] text-white/35"
                            >
                              {new Date(m.createdAt).toLocaleTimeString(
                                undefined,
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </time>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/80 [overflow-wrap:anywhere]">
                            {m.text}
                          </p>
                        </div>
                      </article>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <form
                className="m-3 mt-0 rounded-xl border border-white/20 bg-white/[.025] focus-within:border-white/40 sm:m-4 sm:mt-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <textarea
                  aria-label="Message"
                  className="block w-full resize-none bg-transparent px-4 pt-4 text-sm leading-6 outline-none"
                  rows={3}
                  maxLength={12000}
                  placeholder={`Message ${conversation.thread.subject}`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
                  <span className="text-[11px] text-white/40">
                    <span className="hidden sm:inline">
                      Enter to send · Shift + Enter for a new line
                    </span>
                    <span className="sm:hidden">Private message</span>
                  </span>
                  <button
                    aria-label="Send message"
                    className="admin-button-primary flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs"
                    disabled={busy || !text.trim()}
                  >
                    {busy ? "Sending…" : "Send"}
                    <ArrowUp className="size-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
      <p className="flex items-center gap-2 text-[11px] text-white/40">
        <LockKeyhole className="size-3.5" />
        Encrypted in storage · Visible conversations refresh automatically
      </p>
      {compose && directory ? (
        <ComposeConversation
          anchorRef={newButton}
          directory={directory}
          initialLeadId={initialLead}
          onClose={() => setCompose(false)}
          onCreated={(id) => {
            setCompose(false);
            open(id);
            void loadList().catch((e) => setError(e.message));
          }}
        />
      ) : null}
    </div>
  );
}
