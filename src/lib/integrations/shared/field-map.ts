export function normalizeIntegrationFieldKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function splitIntegrationFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function readIntegrationFieldValue(
  fields: Map<string, string>,
  keys: string[],
) {
  for (const key of keys) {
    const value = fields.get(normalizeIntegrationFieldKey(key));
    if (value) {
      return value;
    }
  }

  return "";
}
