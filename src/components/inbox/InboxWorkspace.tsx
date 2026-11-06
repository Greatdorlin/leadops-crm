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
  Inbox,
  LockKeyhole,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ComposeConversation } from "./ComposeConversation";
import { MailboxSettings } from "./MailboxSettings";
import {
  inboxRequest,
  deliveryLabel,
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
    [settings, setSettings] = useState(false),
    [initialLead, setInitialLead] = useState<string | undefined>(),
    [sharing, setSharing] = useState(false),
    [teammate, setTeammate] = useState("");
  const newButton = useRef<HTMLButtonElement>(null),
    mailButton = useRef<HTMLButtonElement>(null),
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
        [401, 403, 404].includes((error as { status?: number }).status ?? 0) &&
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
  const sync = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      await inboxRequest("", { op: "sync" });
      await loadList();
      const d = await inboxRequest<Directory>("?op=directory");
      setDirectory(d);
      if (activeThread.current) await loadConversation(activeThread.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }, [loadList, loadConversation]);
  useEffect(() => {
    if (!directory?.canConfigure || !directory.mailbox.connected) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, 60000);
    return () => clearInterval(timer);
  }, [directory?.canConfigure, directory?.mailbox.connected, sync]);
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-white/55">
          <LockKeyhole className="size-3.5" />
          {directory?.secure
            ? "Encrypted in storage · private to participants"
            : "Secure messaging"}
        </p>
        <div className="flex flex-wrap gap-2">
          {directory?.canConfigure ? (
            <button
              ref={mailButton}
              className="admin-button-secondary min-h-11 px-3 text-sm"
              onClick={() => setSettings(true)}
              disabled={!directory.secure}
            >
              {directory.mailbox.connected
                ? "Mailbox settings"
                : "Connect mailbox"}
            </button>
          ) : null}
          {directory?.canConfigure && directory.mailbox.connected ? (
            <button
              className="admin-button-secondary min-h-11 px-3 text-sm"
              disabled={busy}
              onClick={() => void sync()}
            >
              <RefreshCw className="mr-2 size-4" />
              Sync email
            </button>
          ) : null}
          <button
            ref={newButton}
            className="admin-button-primary min-h-11 px-4 text-sm"
            disabled={!directory?.secure}
            onClick={() => {
              setInitialLead(undefined);
              setCompose(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            New conversation
          </button>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/25 p-3 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {directory && !directory.secure ? (
        <div
          role="status"
          className="rounded-xl border border-white/10 p-5 text-sm text-white/65"
        >
          Secure messaging is not configured. Ask the workspace owner to finish
          deployment setup. No messages will be stored without encryption.
        </div>
      ) : null}
      {directory?.mailbox.lastError ? (
        <p className="text-xs text-amber-200">
          Email sync needs attention. Existing conversations remain available.
        </p>
      ) : null}
      <div className="grid min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--ld-color-background)]/80 md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <aside
          className={`${selected ? "hidden md:block" : "block"} min-w-0 border-white/10 md:border-r`}
          aria-label="Conversations"
        >
          <div className="border-b border-white/10 px-4 py-4 text-sm font-semibold">
            Conversations
          </div>
          <div className="max-h-[65dvh] overflow-y-auto overscroll-contain">
            {loading ? (
              <p role="status" className="p-5 text-sm text-white/60">
                Loading your inbox…
              </p>
            ) : threads.length ? (
              threads.map((t) => (
                <button
                  key={t.id}
                  className={`ld-focus-ring flex w-full min-w-0 items-start gap-3 border-b border-white/5 p-4 text-left transition hover:bg-white/5 ${selected === t.id ? "bg-white/[.07]" : ""}`}
                  onClick={() => open(t.id)}
                  aria-current={selected === t.id ? "true" : undefined}
                >
                  {t.channel === "email" ? (
                    <Mail className="mt-1 size-4 shrink-0 text-white/50" />
                  ) : (
                    <MessageCircle className="mt-1 size-4 shrink-0 text-white/50" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {t.subject}
                    </span>
                    <span className="mt-1 block text-xs text-white/45">
                      {t.channel === "email"
                        ? "Customer email"
                        : "Private team"}{" "}
                      · {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                  {t.unread > 0 ? (
                    <span className="rounded-full bg-[var(--ld-color-primary)] px-2 py-0.5 text-xs text-white">
                      {t.unread > 99 ? "99+" : t.unread}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="p-6 text-sm text-white/55">
                Your conversations will appear here.
              </div>
            )}
            {next ? (
              <button
                className="min-h-11 w-full p-3 text-sm text-white/65 underline"
                onClick={() =>
                  void inboxRequest<{ threads: Thread[]; next: string | null }>(
                    `?before=${next}`,
                  )
                    .then((d) => {
                      setThreads((rows) => [
                        ...rows,
                        ...d.threads.filter(
                          (t) => !rows.some((r) => r.id === t.id),
                        ),
                      ]);
                      setNext(d.next);
                    })
                    .catch((e) => setError(e.message))
                }
              >
                Load older conversations
              </button>
            ) : null}
          </div>
        </aside>
        <section
          className={`${selected ? "flex" : "hidden md:flex"} min-h-[500px] min-w-0 flex-col`}
          aria-label="Conversation"
        >
          {!selected ? (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div className="max-w-xs">
                <Inbox className="mx-auto mb-5 size-8 text-white/35" />
                <h2 className="text-xl font-semibold tracking-tight">
                  Every conversation, in context.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  Choose a conversation or start a private handoff with your
                  team. Connect a mailbox for customer email.
                </p>
              </div>
            </div>
          ) : !conversation ? (
            <div role="status" className="p-6 text-sm text-white/60">
              Opening conversation…
              {error ? (
                <button
                  className="mt-4 block min-h-11 underline"
                  onClick={back}
                >
                  Back to inbox
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <header className="flex min-w-0 items-start gap-3 border-b border-white/10 p-4">
                <button
                  className="ld-focus-ring grid size-11 shrink-0 place-items-center rounded-lg md:hidden"
                  aria-label="Back to conversations"
                  onClick={back}
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-semibold">
                    {conversation.thread.subject}
                  </h2>
                  <p className="mt-1 break-words text-xs text-white/50">
                    {conversation.thread.members
                      .map((m) => m.name || m.email)
                      .join(", ")}
                  </p>
                  {conversation.thread.leadId ? (
                    <Link
                      className="mt-2 inline-block py-1 text-xs underline underline-offset-4"
                      href={`/leads/${conversation.thread.leadId}`}
                    >
                      Open linked lead
                    </Link>
                  ) : null}
                </div>
                {conversation.thread.canManageParticipants ? (
                  <button
                    className="ld-focus-ring grid size-11 shrink-0 place-items-center rounded-lg hover:bg-white/5"
                    aria-label="Manage conversation participants"
                    onClick={() => setSharing((v) => !v)}
                  >
                    <Users className="size-4" />
                  </button>
                ) : null}
              </header>
              {sharing && directory ? (
                <div className="space-y-3 border-b border-white/10 p-4 text-sm">
                  <p>Only listed participants can read this conversation.</p>
                  {conversation.thread.members
                    .filter((m) => m.id !== directory.currentUserId)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{m.name || m.email}</span>
                        <button
                          className="min-h-11 text-xs underline"
                          disabled={busy}
                          onClick={() =>
                            void share(
                              conversation.thread.members
                                .filter((x) => x.id !== m.id)
                                .map((x) => x.id),
                            )
                          }
                        >
                          Remove access
                        </button>
                      </div>
                    ))}
                  <div className="flex min-w-0 gap-2">
                    <AdminSelect
                      className="min-h-11 min-w-0 flex-1"
                      aria-label="Add teammate to conversation"
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
                </div>
              ) : null}
              <div
                className="flex max-h-[55dvh] min-h-64 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4"
                aria-label="Messages"
                aria-live="polite"
              >
                {conversation.next ? (
                  <button
                    className="min-h-11 text-xs text-white/60 underline"
                    onClick={() =>
                      void inboxRequest<Conversation>(
                        `?threadId=${selected}&before=${conversation.next}`,
                      )
                        .then((d) =>
                          setConversation((c) =>
                            c && c.thread.id === d.thread.id
                              ? {
                                  ...c,
                                  next: d.next,
                                  messages: [...d.messages, ...c.messages],
                                }
                              : c,
                          ),
                        )
                        .catch((e) => setError(e.message))
                    }
                  >
                    Load earlier messages
                  </button>
                ) : null}
                {conversation.messages.map((m) => (
                  <article
                    key={m.id}
                    className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${m.own ? "self-end bg-[color:var(--ld-color-primary)]/15" : "self-start bg-white/[.055]"}`}
                  >
                    <p className="mb-2 text-xs font-medium text-white/55">
                      {m.author}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
                      {m.text}
                    </p>
                    {m.attachmentsSkipped ? (
                      <p className="mt-2 text-xs text-amber-100/70">
                        {m.attachmentsSkipped} attachment(s) remain in the
                        original mailbox.
                      </p>
                    ) : null}
                    {m.truncated ? (
                      <p className="mt-2 text-xs text-amber-100/70">
                        Open your mailbox for the complete email.
                      </p>
                    ) : null}
                    <p
                      className={`mt-2 text-[11px] ${m.status === "failed" || m.status === "unknown" ? "text-amber-200" : "text-white/40"}`}
                    >
                      {new Date(m.createdAt).toLocaleString()} ·{" "}
                      {deliveryLabel(m.status, m.direction)}
                    </p>
                    {m.own && m.status === "failed" ? (
                      <button
                        className="mt-2 min-h-11 text-xs underline"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void inboxRequest("", {
                            op: "retry",
                            messageId: m.id,
                          })
                            .then(() => loadConversation(m.threadId))
                            .catch((e) => setError(e.message))
                            .finally(() => setBusy(false));
                        }}
                      >
                        Retry failed email
                      </button>
                    ) : null}
                  </article>
                ))}
                <div ref={bottom} />
              </div>
              <form
                className="border-t border-white/10 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label className="sr-only" htmlFor="inbox-reply">
                  Write a reply
                </label>
                <textarea
                  id="inbox-reply"
                  className="admin-input w-full"
                  rows={3}
                  placeholder={
                    conversation.thread.channel === "email"
                      ? "Reply to the customer…"
                      : "Message your team…"
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={12000}
                  required
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-white/40">
                    {conversation.thread.channel === "email"
                      ? "Email uses TLS to your mail server. It is not end-to-end encrypted."
                      : "Private to the participants listed above."}
                  </p>
                  <button
                    className="admin-button-primary inline-flex min-h-11 shrink-0 items-center gap-2 px-4"
                    disabled={busy || !text.trim() || !directory?.secure}
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
      {directory?.mailbox.connected ? (
        <p className="text-xs text-white/40">
          {directory.mailbox.lastSyncAt
            ? `Email last synced ${new Date(directory.mailbox.lastSyncAt).toLocaleString()}.`
            : "Mailbox connected. Sync email to import recent messages."}{" "}
          The owner can sync here or schedule background sync.
        </p>
      ) : null}
      {compose && directory ? (
        <ComposeConversation
          anchorRef={newButton}
          directory={directory}
          initialLeadId={initialLead}
          onClose={() => setCompose(false)}
          onCreated={(id) => {
            setCompose(false);
            void loadList();
            open(id);
          }}
        />
      ) : null}
      {settings ? (
        <MailboxSettings
          anchorRef={mailButton}
          onClose={() => setSettings(false)}
          onConnected={() => {
            setSettings(false);
            void inboxRequest<Directory>("?op=directory")
              .then(setDirectory)
              .catch((e) => setError(e.message));
          }}
        />
      ) : null}
    </div>
  );
}
