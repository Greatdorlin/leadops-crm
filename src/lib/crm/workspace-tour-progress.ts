export function tourProgress(
  value: string | null,
  userId: string,
  version: number,
  length: number,
): number | null {
  try {
    const saved = JSON.parse(value ?? "null");
    return saved?.userId === userId &&
      saved?.version === version &&
      Number.isInteger(saved?.step) &&
      saved.step >= 0 &&
      saved.step < length
      ? saved.step
      : null;
  } catch {
    return null;
  }
}
