export interface LeadCursorValue {
  updatedAt: string;
  id: string;
}

export function encodeLeadCursor(value: LeadCursorValue) {
  const timestamp = new Date(value.updatedAt);
  const id = value.id.trim();

  if (!Number.isFinite(timestamp.getTime()) || !id || id.length > 128) {
    throw new Error("Cannot create a cursor for this lead.");
  }

  return Buffer.from(JSON.stringify([timestamp.toISOString(), id]), "utf8").toString("base64url");
}

export function decodeLeadCursor(cursor?: string | null): LeadCursorValue | null {
  if (!cursor || cursor.length > 512) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== 2) {
      return null;
    }

    const [updatedAt, id] = decoded;
    if (typeof updatedAt !== "string" || typeof id !== "string") {
      return null;
    }

    const timestamp = new Date(updatedAt);
    const normalizedId = id.trim();
    if (!Number.isFinite(timestamp.getTime()) || !normalizedId || normalizedId.length > 128) {
      return null;
    }

    return {
      updatedAt: timestamp.toISOString(),
      id: normalizedId,
    };
  } catch {
    return null;
  }
}
