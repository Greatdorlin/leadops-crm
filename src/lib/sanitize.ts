export function sanitizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function sanitizeNullable(value: string | null | undefined) {
  const sanitized = sanitizeText(value);
  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizePhone(value: string | null | undefined) {
  const cleaned = sanitizeText(value).replace(/[^\d+]/g, "");
  return cleaned.slice(0, 30);
}

export function sanitizeEmail(value: string | null | undefined) {
  return sanitizeText(value).toLowerCase();
}
