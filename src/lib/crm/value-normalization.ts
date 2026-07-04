export function normalizeText(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmail(value?: string | null) {
  return normalizeText(value)?.toLowerCase() ?? null;
}

export function normalizePhone(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/[^\d+]/g, "");
}

export function pickPreferredValue<T>(current: T | null | undefined, incoming: T | null | undefined) {
  return incoming ?? current ?? null;
}
