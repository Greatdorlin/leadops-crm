import { readBoundedBody } from "@/lib/http/bounded-body";
import { AssistantError } from "./contracts";
export async function oauthParameters(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.includes("application/x-www-form-urlencoded")
  )
    throw new AssistantError("invalid_request", 400);
  const b = await readBoundedBody(request, 8192);
  if (!b.ok) throw new AssistantError("invalid_request", b.status);
  const params = new URLSearchParams(b.text);
  let method = params.has("client_secret") ? "client_secret_post" : "none";
  const authorization = request.headers.get("authorization");
  if (authorization) {
    if (!/^Basic /i.test(authorization) || params.has("client_secret"))
      throw new AssistantError("invalid_client", 401);
    const decoded = Buffer.from(authorization.slice(6), "base64").toString(
      "utf8",
    );
    const colon = decoded.indexOf(":");
    if (colon < 1) throw new AssistantError("invalid_client", 401);
    const id = decodeURIComponent(decoded.slice(0, colon)),
      password = decodeURIComponent(decoded.slice(colon + 1));
    if (params.has("client_id") && params.get("client_id") !== id)
      throw new AssistantError("invalid_client", 401);
    params.set("client_id", id);
    params.set("client_secret", password);
    method = "client_secret_basic";
  }
  return { params, method };
}
