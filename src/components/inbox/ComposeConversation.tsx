"use client";
import { useEffect, useRef, useState } from "react";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ResponsivePopover } from "@/components/admin/ResponsivePopover";
import { inboxRequest, type Directory } from "./client";
type Lead = { id: string; name: string; email: string | null };
export function ComposeConversation({
  anchorRef,
  onClose,
  onCreated,
  directory,
  initialLeadId,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onCreated: (id: string) => void;
  directory: Directory;
  initialLeadId?: string;
}) {
  const [channel, setChannel] = useState("team"),
    [recipient, setRecipient] = useState(""),
    [subject, setSubject] = useState(""),
    [text, setText] = useState(""),
    [query, setQuery] = useState(""),
    [lead, setLead] = useState<Lead | null>(null),
    [matches, setMatches] = useState<Lead[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<{ signature: string; id: string } | null>(null),
    guard = useRef(false);
  useEffect(() => {
    if (!initialLeadId) return;
    let active = true;
    inboxRequest<{ lead: Lead }>(`?op=lead&id=${initialLeadId}`)
      .then((d) => {
        if (active) {
          setLead(d.lead);
          setSubject(`Follow-up: ${d.lead.name}`);
          if (directory.mailbox.connected) setChannel("email");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [initialLeadId, directory.mailbox.connected]);
  async function search() {
    setError("");
    setBusy(true);
    try {
      setMatches(
        (
          await inboxRequest<{ leads: Lead[] }>(
            `?op=leads&query=${encodeURIComponent(query)}`,
          )
        ).leads,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const data = {
        channel,
        subject,
        text,
        participantIds: recipient ? [recipient] : [],
        leadId: lead?.id ?? null,
      };
      const signature = JSON.stringify(data);
      if (pending.current?.signature !== signature)
        pending.current = { signature, id: crypto.randomUUID() };
      const r = await inboxRequest<{ threadId: string }>("", {
        op: "create",
        requestId: pending.current.id,
        ...data,
      });
      onCreated(r.threadId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Conversation could not be created.",
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <ResponsivePopover
      open
      anchorRef={anchorRef}
      onClose={onClose}
      ariaLabel="New conversation"
      desktopWidth={560}
    >
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold">New conversation</h2>
          <button
            className="admin-button-secondary min-h-11 px-3"
            onClick={onClose}
          >
            Cancel
          </button>
        </header>
        <form
          className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="block text-sm">
            Conversation type
            <AdminSelect
              className="mt-2 min-h-11"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="team">Private team conversation</option>
              <option value="email" disabled={!directory.mailbox.connected}>
                Customer email
                {!directory.mailbox.connected ? " — connect mailbox first" : ""}
              </option>
            </AdminSelect>
          </label>
          {channel === "team" ? (
            <label className="block text-sm">
              Teammate
              <AdminSelect
                value={recipient}
                className="mt-2 min-h-11"
                onChange={(e) => setRecipient(e.target.value)}
                required
              >
                <option value="">Choose a teammate</option>
                {directory.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </AdminSelect>
            </label>
          ) : (
            <p className="text-sm text-white/60">
              Send from the verified workspace mailbox to the selected lead.
            </p>
          )}
          <div>
            <label className="block text-sm" htmlFor="inbox-lead-search">
              {channel === "email"
                ? "Lead (required)"
                : "Link a lead (optional)"}
            </label>
            {lead ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm">
                <span>
                  {lead.name}
                  {channel === "email" && lead.email ? (
                    <span className="mt-1 block text-xs text-white/60">
                      {lead.email}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="min-h-11 px-2 text-xs underline"
                  onClick={() => {
                    setLead(null);
                    setMatches([]);
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="mt-2 flex gap-2">
                  <input
                    id="inbox-lead-search"
                    className="admin-input min-h-11 min-w-0 flex-1"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Name or email"
                    maxLength={200}
                  />
                  <button
                    type="button"
                    className="admin-button-secondary min-h-11 px-3"
                    disabled={busy || query.trim().length < 2}
                    onClick={() => void search()}
                  >
                    Find
                  </button>
                </div>
                {matches.map((l) => (
                  <button
                    type="button"
                    key={l.id}
                    className="mt-1 block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      setLead(l);
                      setMatches([]);
                    }}
                  >
                    {l.name}
                    <span className="ml-2 text-xs text-white/55">
                      {l.email}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
          <label className="block text-sm">
            Subject
            <input
              className="admin-input mt-2 min-h-11 w-full"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              required
              minLength={2}
            />
          </label>
          <label className="block text-sm">
            Message
            <textarea
              className="admin-input mt-2 w-full"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={12000}
              required
            />
          </label>
          {lead && channel === "team" ? (
            <p className="text-xs text-white/55">
              The teammate must already have access to this lead. Messaging does
              not change lead permissions.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          <button
            className="admin-button-primary min-h-11 w-full px-4 py-2"
            disabled={
              busy ||
              !subject.trim() ||
              !text.trim() ||
              (channel === "team" && !recipient) ||
              (channel === "email" && (!lead || !lead.email))
            }
          >
            {busy ? "Sending…" : "Start conversation"}
          </button>
          <p className="text-xs text-white/45">
            Subjects and messages are encrypted in storage. Email is not
            end-to-end encrypted.
          </p>
        </form>
      </div>
    </ResponsivePopover>
  );
}
