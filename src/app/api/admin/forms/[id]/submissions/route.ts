import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageForms } from "@/lib/crm/authz";
import {
  getFormById,
  getFormResourceCounts,
  listFormSubmissions,
} from "@/lib/crm/form-builder-store";
import {
  decodeFormSubmissionCursor,
  encodeFormSubmissionCursor,
} from "@/lib/crm/form-submission-pagination";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageForms(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const form = await getFormById(id);
  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const rawCursor = url.searchParams.get("cursor");
  const cursor = decodeFormSubmissionCursor(rawCursor);
  const direction = url.searchParams.get("direction") === "prev" ? "prev" : "next";
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const [submissions, counts] = await Promise.all([
    listFormSubmissions(id, {
      limit,
      cursor: cursor ? rawCursor ?? undefined : undefined,
      cursorDirection: direction,
    }),
    getFormResourceCounts([id]),
  ]);

  const previous = submissions[0];
  const next = submissions.at(-1);
  return NextResponse.json({
    submissions,
    total: counts.get(id)?.submissionCount ?? 0,
    previousCursor: previous
      ? encodeFormSubmissionCursor({ id: previous.id, createdAt: previous.createdAt.toISOString() })
      : null,
    nextCursor: next
      ? encodeFormSubmissionCursor({ id: next.id, createdAt: next.createdAt.toISOString() })
      : null,
  });
}
