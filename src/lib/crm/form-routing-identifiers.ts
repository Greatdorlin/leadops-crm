export function isFormUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function getFormOwnerReference(value?: string | null) {
  const reference = value?.trim();
  if (!reference) return null;
  if (isFormUuid(reference)) return { id: reference, email: null };
  if (/^[^\s@]+@[^\s@]+$/.test(reference)) {
    return { id: null, email: reference.toLowerCase() };
  }
  return null;
}
