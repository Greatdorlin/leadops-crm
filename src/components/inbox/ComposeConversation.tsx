"use client";
import { useEffect, useRef, useState } from "react";

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
  const [recipients, setRecipients] = useState<string[]>([]),
    [peopleQuery, setPeopleQuery] = useState(""),
    [searched, setSearched] = useState(false),
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
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [initialLeadId]);
  async function search() {
    setError("");
    setBusy(true);
    try {
      setSearched(true);
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
        channel: "team",
        subject:
          subject.trim() ||
          directory.users
            .filter((u) => recipients.includes(u.id))
            .map((u) => u.name || u.email)
            .join(", ")
            .slice(0, 160),
        text,
        participantIds: recipients,
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
      ariaLabel="New message"
      desktopWidth={560}
      desktopMaxHeight={720}
    >
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold">New message</h2>
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
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">To</legend>
            <input
              className="admin-input min-h-11 w-full"
              aria-label="Find teammates"
              placeholder="Find a teammate…"
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {directory.users
                .filter((u) => recipients.includes(u.id))
                .map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs"
                    onClick={() =>
                      setRecipients((ids) => ids.filter((id) => id !== u.id))
                    }
                    aria-label={`Remove ${u.name || u.email}`}
                  >
                    {u.name || u.email} ×
                  </button>
                ))}
            </div>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10">
              {directory.users
                .filter((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(peopleQuery.toLowerCase()),
                )
                .map((u) => (
                  <label
                    key={u.id}
                    className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={recipients.includes(u.id)}
                      disabled={
                        !recipients.includes(u.id) && recipients.length >= 19
                      }
                      onChange={(e) =>
                        setRecipients((ids) =>
                          e.target.checked
                            ? [...ids, u.id]
                            : ids.filter((id) => id !== u.id),
                        )
                      }
                    />
                    <span className="min-w-0 break-words">
                      {u.name || u.email}
                    </span>
                  </label>
                ))}
              {!directory.users.length ? (
                <p className="p-4 text-sm text-white/60">
                  No teammates yet. Ask your workspace owner to invite your
                  team.
                </p>
              ) : null}
              {directory.users.length > 0 &&
              !directory.users.some((u) =>
                `${u.name} ${u.email}`
                  .toLowerCase()
                  .includes(peopleQuery.toLowerCase()),
              ) ? (
                <p className="p-4 text-sm text-white/60">
                  No teammates match your search.
                </p>
              ) : null}
            </div>
            <p className="text-xs text-white/50">
              Choose one person for a direct message, or several for a private
              group. {recipients.length}/19 selected.
            </p>
          </fieldset>
          <div>
            <label className="block text-sm" htmlFor="inbox-lead-search">
              Link a lead (optional)
            </label>
            {lead ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm">
                <span>{lead.name}</span>
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
                {searched && !matches.length ? (
                  <p role="status" className="mt-2 text-xs text-white/60">
                    No leads found. Try a full name or email.
                  </p>
                ) : null}
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
            Group name (optional)
            <input
              className="admin-input mt-2 min-h-11 w-full"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              minLength={2}
              placeholder="e.g. Sales handoff"
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
          {lead ? (
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
            disabled={busy || !text.trim() || !recipients.length}
          >
            {busy ? "Sending…" : "Start conversation"}
          </button>
          <p className="text-xs text-white/45">
            Group name (optional)s and messages are encrypted in storage. Email
            is not end-to-end encrypted.
          </p>
        </form>
      </div>
    </ResponsivePopover>
  );
}
