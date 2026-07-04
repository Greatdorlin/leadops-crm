import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { listFormSubmissions } from "@/lib/crm/form-builder-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const submissions = await listFormSubmissions(id);
  return NextResponse.json({ submissions });
}
