export interface NotificationCursorValue {
  createdAt: string;
  id: string;
}

export function encodeNotificationCursor(value: NotificationCursorValue) {
  const timestamp = new Date(value.createdAt);
  const id = value.id.trim();

  if (!Number.isFinite(timestamp.getTime()) || !id || id.length > 128) {
    throw new Error("Cannot create a cursor for this notification.");
  }

  return Buffer.from(JSON.stringify([timestamp.toISOString(), id]), "utf8").toString("base64url");
}

export function decodeNotificationCursor(cursor?: string | null): NotificationCursorValue | null {
  if (!cursor || cursor.length > 512) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== 2) {
      return null;
    }

    const [createdAt, id] = decoded;
    if (typeof createdAt !== "string" || typeof id !== "string") {
      return null;
    }

    const timestamp = new Date(createdAt);
    const normalizedId = id.trim();
    if (!Number.isFinite(timestamp.getTime()) || !normalizedId || normalizedId.length > 128) {
      return null;
    }

    return { createdAt: timestamp.toISOString(), id: normalizedId };
  } catch {
    return null;
  }
}
