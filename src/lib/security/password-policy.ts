// bcrypt only uses the first 72 UTF-8 bytes. Reject longer new passwords
// instead of silently accepting secrets that share the same effective value.
export function newPasswordError(password: string): string | null {
  if (new TextEncoder().encode(password).length > 72) {
    return "This password is too long. Try a shorter passphrase.";
  }
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use at least 12 characters with a letter and a number.";
  }
  return null;
}

export function validateNewPassword(password: string) {
  return newPasswordError(password) === null;
}
