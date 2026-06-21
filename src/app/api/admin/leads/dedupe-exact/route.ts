import { and, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import {
  buildLeadAssigneeList,
  getPrimaryLeadAssignee,
  parseLeadAssignees,
} from "@/lib/crm/lead-assignees";
import { getDb } from "@/lib/db/client";
import { leadEvents, leadNotes, leadTasks } from "@/lib/db/schema";
import { canAccessLeadTrash } from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

type DuplicateLeadCandidateRow = {
  id: string;
  emailKey: string;
  phoneKey: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  stageId: string | null;
  wonAt: string | null;
  lostAt: string | null;
  priority: string;
  assignedTo: string | null;
  noteCount: number;
  taskCount: number;
  eventCount: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeDuplicateRow(row: Record<string, unknown>): DuplicateLeadCandidateRow {
  return {
    id: String(row.id),
    emailKey: String(row.emailKey),
    phoneKey: String(row.phoneKey),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    lastActivityAt: String(row.lastActivityAt),
    stageId: typeof row.stageId === "string" ? row.stageId : null,
    wonAt: typeof row.wonAt === "string" ? row.wonAt : null,
    lostAt: typeof row.lostAt === "string" ? row.lostAt : null,
    priority: String(row.priority ?? "medium"),
    assignedTo: typeof row.assignedTo === "string" ? row.assignedTo : null,
    noteCount: toNumber(row.noteCount),
    taskCount: toNumber(row.taskCount),
    eventCount: toNumber(row.eventCount),
  };
}

function leadScore(row: DuplicateLeadCandidateRow) {
  const assigneeCount = parseLeadAssignees(row.assignedTo).length;
  return (
    assigneeCount * 1000 +
    row.taskCount * 120 +
    row.noteCount * 80 +
    row.eventCount * 10 +
    (row.stageId ? 80 : 0) +
    (row.wonAt ? 120 : 0) +
    (row.lostAt ? 20 : 0)
  );
}

function compareDuplicateRows(left: DuplicateLeadCandidateRow, right: DuplicateLeadCandidateRow) {
  const scoreDelta = leadScore(right) - leadScore(left);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const activityDelta =
    new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
  if (activityDelta !== 0) {
    return activityDelta;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function groupDuplicateRows(rows: DuplicateLeadCandidateRow[]) {
  const groups = new Map<string, DuplicateLeadCandidateRow[]>();

  for (const row of rows) {
    const key = `${row.emailKey}::${row.phoneKey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return [...groups.entries()].map(([key, groupRows]) => {
    const sorted = [...groupRows].sort(compareDuplicateRows);
    const survivor = sorted[0];
    const duplicates = sorted.slice(1);
    const mergedAssignees = buildLeadAssigneeList({
      primary: getPrimaryLeadAssignee(survivor?.assignedTo),
      all: sorted.flatMap((row) => parseLeadAssignees(row.assignedTo)),
    });

    return {
      key,
      emailKey: survivor.emailKey,
      phoneKey: survivor.phoneKey,
      survivor,
      duplicates,
      mergedAssignees,
    };
  });
}

async function getExactDuplicateRows() {
  const db = getDb();
  const result = await db.execute(sql`
    with normalized as (
      select
        l.id,
        lower(trim(l.email)) as "emailKey",
        regexp_replace(trim(l.whatsapp_number), '[^0-9]+', '', 'g') as "phoneKey",
        l.created_at as "createdAt",
        l.updated_at as "updatedAt",
        l.last_activity_at as "lastActivityAt",
        l.stage_id as "stageId",
        l.won_at as "wonAt",
        l.lost_at as "lostAt",
        l.priority,
        l.assigned_to as "assignedTo",
        (select count(*)::int from lead_notes n where n.lead_id = l.id) as "noteCount",
        (select count(*)::int from lead_tasks t where t.lead_id = l.id) as "taskCount",
        (select count(*)::int from lead_events e where e.lead_id = l.id) as "eventCount"
      from leads l
      where l.deleted_at is null
        and coalesce(trim(l.email), '') <> ''
        and coalesce(trim(l.whatsapp_number), '') <> ''
    ),
    duplicate_keys as (
      select "emailKey", "phoneKey"
      from normalized
      group by 1, 2
      having count(*) > 1
    )
    select normalized.*
    from normalized
    inner join duplicate_keys
      on duplicate_keys."emailKey" = normalized."emailKey"
     and duplicate_keys."phoneKey" = normalized."phoneKey"
    order by normalized."emailKey" asc, normalized."phoneKey" asc, normalized."createdAt" asc
  `);

  return result.rows.map((row) => normalizeDuplicateRow(row as Record<string, unknown>));
}

async function applyCleanup(actorEmail: string | null) {
  const db = getDb();
  const rows = await getExactDuplicateRows();
  const groups = groupDuplicateRows(rows);
  const cleanedGroups = [];

  for (const group of groups) {
    if (group.duplicates.length === 0) {
      continue;
    }

    const duplicateIds = group.duplicates.map((row) => row.id);
    const needsAssigneeMerge =
      group.mergedAssignees.join("|") !== parseLeadAssignees(group.survivor.assignedTo).join("|");

    if (needsAssigneeMerge) {
      await leadStore.assignLeadOwners(group.survivor.id, group.mergedAssignees, actorEmail);
    }

    await db
      .update(leadNotes)
      .set({ leadId: group.survivor.id })
      .where(inArray(leadNotes.leadId, duplicateIds));

    await db
      .update(leadTasks)
      .set({ leadId: group.survivor.id })
      .where(inArray(leadTasks.leadId, duplicateIds));

    await db
      .update(leadEvents)
      .set({ leadId: group.survivor.id })
      .where(
        and(
          inArray(leadEvents.leadId, duplicateIds),
          sql`${leadEvents.eventType} <> 'lead_trashed'`,
        ),
      );

    for (const duplicateId of duplicateIds) {
      await leadStore.softDeleteLead(duplicateId, actorEmail);
    }

    cleanedGroups.push({
      emailKey: group.emailKey,
      phoneKey: group.phoneKey,
      survivorId: group.survivor.id,
      trashedIds: duplicateIds,
      mergedAssignees: group.mergedAssignees,
    });
  }

  return cleanedGroups;
}

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessLeadTrash(context.accessLevel)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const rows = await getExactDuplicateRows();
  const groups = groupDuplicateRows(rows);

  return NextResponse.json({
    groups: groups.map((group) => ({
      emailKey: group.emailKey,
      phoneKey: group.phoneKey,
      survivorId: group.survivor.id,
      survivorAssignedTo: parseLeadAssignees(group.survivor.assignedTo),
      duplicateIds: group.duplicates.map((row) => row.id),
      mergedAssignees: group.mergedAssignees,
      totalRows: group.duplicates.length + 1,
    })),
    summary: {
      duplicateGroups: groups.length,
      removableCopies: groups.reduce((total, group) => total + group.duplicates.length, 0),
    },
  });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessLeadTrash(context.accessLevel)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { dryRun?: boolean } | null;
  if (payload?.dryRun !== false) {
    return GET();
  }

  const cleanedGroups = await applyCleanup(context.session.user?.email ?? null);
  return NextResponse.json({
    success: true,
    groups: cleanedGroups,
    summary: {
      duplicateGroups: cleanedGroups.length,
      trashedCopies: cleanedGroups.reduce((total, group) => total + group.trashedIds.length, 0),
    },
  });
}
