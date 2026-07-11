export function isVerifiedGoogleProfile(profile: unknown) {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  return (profile as { email_verified?: unknown }).email_verified === true;
}
