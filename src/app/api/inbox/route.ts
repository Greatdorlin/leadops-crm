import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { readBoundedJsonObject } from "@/lib/http/bounded-body";
import { CrmAccessError } from "@/lib/crm/active-actor";
import { activeCrmActor } from "@/lib/crm/active-actor";
import {
  scopeLeadListFilters,
  canViewLeadRecord,
} from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";
import { InboxError } from "@/lib/inbox/contracts";
import {
  createThread,
  inboxDirectory,
  listThreads,
  markRead,
  readThread,
  sendMessage,
  updateParticipants,
} from "@/lib/inbox/store";
import { threadAccess } from "@/lib/inbox/access";
import { requireTeamChannel } from "@/lib/inbox/team-policy";
async function teamThread(userId: string, threadId: unknown) {
  const id = z.string().uuid().parse(threadId);
  const { thread } = await threadAccess(userId, id);
  requireTeamChannel(thread.channel);
  return id;
}
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
async function userId() {
  const c = await getAdminRequestContext();
  if (!c?.crmUser?.id || c.requestedAccessLevel)
    throw new InboxError("Sign in with your own workspace account.", 401);
  return c.crmUser.id;
}
function failure(e: unknown) {
  const status =
    e instanceof InboxError || e instanceof CrmAccessError
      ? e.status
      : e instanceof ZodError
        ? 400
        : 503;
  return NextResponse.json(
    {
      error:
        e instanceof InboxError || e instanceof CrmAccessError
          ? e.message
          : e instanceof ZodError
            ? e.issues[0]?.message
            : "Messages are temporarily unavailable. Please try again.",
    },
    { status, headers },
  );
}
export async function GET(request: Request) {
  try {
    const id = await userId(),
      q = new URL(request.url).searchParams;
    const before = q.get("before")
      ? z.string().uuid().parse(q.get("before"))
      : undefined;
    if (q.get("op") === "leads") {
      const actor = await activeCrmActor(id);
      const query = z.string().trim().min(2).max(200).parse(q.get("query"));
      const rows = await leadStore.list(
        scopeLeadListFilters(
          { search: query, limit: 10 },
          actor.accessLevel,
          actor.user.email,
          actor.user,
        ),
      );
      return NextResponse.json(
        {
          leads: rows
            .filter(
              (l) =>
                !l.deletedAt &&
                canViewLeadRecord(
                  actor.accessLevel,
                  l,
                  actor.user.email,
                  actor.permissions,
                  actor.user,
                ),
            )
            .map((l) => ({
              id: l.id,
              name: [l.firstName, l.lastName].filter(Boolean).join(" "),
              email: l.email,
            })),
        },
        { headers },
      );
    }
    if (q.get("op") === "lead") {
      const actor = await activeCrmActor(id);
      const lead = await leadStore.getById(
        z.string().uuid().parse(q.get("id")),
      );
      if (
        !lead ||
        lead.deletedAt ||
        !canViewLeadRecord(
          actor.accessLevel,
          lead,
          actor.user.email,
          actor.permissions,
          actor.user,
        )
      )
        throw new InboxError("Lead not available.", 404);
      return NextResponse.json(
        {
          lead: {
            id: lead.id,
            name: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
            email: lead.email,
          },
        },
        { headers },
      );
    }
    if (q.get("op") === "directory")
      return NextResponse.json(await inboxDirectory(id), { headers });
    if (q.get("op") === "mailbox")
      throw new InboxError("Email has been removed from Inbox.", 410);
    if (q.get("threadId"))
      return NextResponse.json(
        await readThread(id, await teamThread(id, q.get("threadId")), before),
        { headers },
      );
    return NextResponse.json(await listThreads(id, before), { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new InboxError("Open this action from your workspace.", 403);
    const id = await userId();
    const b = await readBoundedJsonObject(request, 32 * 1024);
    if (!b.ok) throw new InboxError(b.error, b.status);
    const p = b.value;
    if (p.op === "create") {
      requireTeamChannel(p.channel ?? "team");
      const result = await createThread(id, { ...p, channel: "team" });
      return NextResponse.json(result, { headers });
    }
    if (p.op === "send") {
      await teamThread(id, p.threadId);
      const message = await sendMessage(id, p);
      return NextResponse.json({ message }, { headers });
    }
    if (p.op === "read") {
      await markRead(
        id,
        await teamThread(id, p.threadId),
        z.iso.datetime().parse(p.through),
      );
      return NextResponse.json({ ok: true }, { headers });
    }
    if (p.op === "participants") {
      await updateParticipants(
        id,
        await teamThread(id, p.threadId),
        z.array(z.string().uuid()).max(19).parse(p.participantIds),
      );
      return NextResponse.json({ ok: true }, { headers });
    }
    if (["mailbox", "sync", "retry"].includes(String(p.op)))
      throw new InboxError("Email has been removed from Inbox.", 410);
    throw new InboxError("Choose a valid inbox action.");
  } catch (e) {
    return failure(e);
  }
}
