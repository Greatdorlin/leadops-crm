import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";
import { readBoundedJsonObject } from "@/lib/http/bounded-body";
import { AssistantError } from "./contracts";
export function origin() {
  const value = resolvePublicAppOrigin();
  if (!value || !value.startsWith("https://"))
    throw new AssistantError(
      "Set the public HTTPS workspace URL before connecting an AI tool.",
      503,
    );
  return value;
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new AssistantError("Open this action from the workspace.", 403);
}
export async function body(request: Request) {
  const result = await readBoundedJsonObject(request, 32 * 1024);
  if (!result.ok) throw new AssistantError(result.error, result.status);
  return result.value;
}
export function failure(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Check the submitted details." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    {
      error:
        error instanceof AssistantError
          ? error.message
          : "This action could not be completed.",
    },
    {
      status: error instanceof AssistantError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
