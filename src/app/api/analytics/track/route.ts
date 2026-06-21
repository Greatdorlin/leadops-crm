import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Legacy report analytics tracking is no longer available in Leads Desk.",
    },
    { status: 410 },
  );
}
