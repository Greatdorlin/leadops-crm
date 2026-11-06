import { NextResponse } from "next/server";
import { sessionActor } from "@/lib/assistant/access";
import { authorize } from "@/lib/assistant/oauth";
import { sameOrigin, failure } from "@/lib/assistant/http";
import { readBoundedBody } from "@/lib/http/bounded-body";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await sessionActor();
    const data = await readBoundedBody(request, 16384);
    if (!data.ok) throw new Error();
    const params = new URLSearchParams(data.text);
    const target = await authorize(
      actor.user.id,
      params,
      params.get("allow_write") === "yes",
    );
    return NextResponse.redirect(target, 303);
  } catch (e) {
    return failure(e);
  }
}
