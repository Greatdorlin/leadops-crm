import { normalizeEnvValue } from "@/lib/env-utils";

export function resolvePublicAppOrigin(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fallback?: string,
) {
  for (const candidate of [environment.CRM_PUBLIC_BASE_URL, environment.NEXTAUTH_URL, environment.NEXT_PUBLIC_APP_URL, fallback]) {
    const value = normalizeEnvValue(candidate);
    if (!value) continue;
    try {
      const url = new URL(value);
      if (
        (url.protocol === "https:" || url.protocol === "http:") &&
        !url.username && !url.password && !url.search && !url.hash && url.pathname === "/"
      ) {
        return url.origin;
      }
    } catch {
      continue;
    }
  }
  return "";
}
