export const MAX_PUBLIC_INTAKE_BODY_BYTES = 256 * 1024;

export type BoundedBodyResult =
  | { ok: true; text: string }
  | { ok: false; status: 400 | 413; error: string };

export async function readBoundedBody(
  request: Request,
  maxBytes = MAX_PUBLIC_INTAKE_BODY_BYTES,
): Promise<BoundedBodyResult> {
  const declaredLength = Number.parseInt(
    request.headers.get("content-length") ?? "0",
    10,
  );
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413, error: "Payload is too large." };
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Request body is required." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Payload is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Request body could not be read." };
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, text: new TextDecoder().decode(body) };
}

export async function readBoundedJsonObject(
  request: Request,
  maxBytes = MAX_PUBLIC_INTAKE_BODY_BYTES,
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413; error: string }
> {
  const body = await readBoundedBody(request, maxBytes);
  if (!body.ok) return body;

  try {
    const value = JSON.parse(body.text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, status: 400, error: "JSON payload must be an object." };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON payload." };
  }
}
