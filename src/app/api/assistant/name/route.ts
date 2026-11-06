import { NextResponse } from "next/server";
import { sessionActor, actorLabel } from "@/lib/assistant/access";
export async function GET() {
  try {
    const actor = await sessionActor(false);
    return NextResponse.json(
      { name: await actorLabel(actor), showLauncher: actor.enabled && (actor.member?.showLauncher ?? true) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { name: "Yapper" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
