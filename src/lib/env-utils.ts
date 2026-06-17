export function normalizeEnvValue(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || trimmed === '""' || trimmed === "''") {
    return "";
  }

  const match = trimmed.match(/^(['"])(.*)\1$/);
  return match ? match[2].trim() : trimmed;
}

export function hasConfiguredEnvValue(value?: string | null) {
  return Boolean(normalizeEnvValue(value));
}
