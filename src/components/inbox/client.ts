export type Person = { id: string; name: string | null; email: string };
export type Thread = {
  id: string;
  subject: string;
  channel: string;
  leadId: string | null;
  unread: number;
  memberCount: number;
  updatedAt: string;
};
export type Message = {
  id: string;
  threadId: string;
  text: string;
  author: string;
  own: boolean;
  status: string;
  direction: string;
  createdAt: string;
  attachmentsSkipped?: number;
  truncated?: boolean;
};
export type Conversation = {
  thread: Thread & { members: Person[]; canManageParticipants: boolean };
  messages: Message[];
  next: string | null;
  seenThrough: string;
};
export type Directory = {
  users: Person[];
  currentUserId: string;
  secure: boolean;
  canConfigure: boolean;
};
export async function inboxRequest<T>(
  path = "",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(`/api/inbox${path}`, {
    cache: "no-store",
    signal,
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const d = await r.json();
  if (!r.ok)
    throw Object.assign(
      new Error(d.error || "Inbox is temporarily unavailable."),
      { status: r.status },
    );
  return d;
}
export function deliveryLabel(status: string, direction: string) {
  if (direction === "team") return "Sent";
  return (
    (
      {
        queued: "Waiting to send",
        sending: "Sending…",
        sent: "Accepted by mail server",
        received: "External email",
        failed: "Not sent",
        unknown: "Delivery unconfirmed—check your mailbox",
      } as Record<string, string>
    )[status] || status
  );
}
