/** Unqualified is an offer outcome; it must never close a whole lead implicitly. */
export function isUnqualifiedStage(key: string, label?: string) {
  return [key, label].some((value) =>
    /^(unqualified|not_qualified)$/i.test(
      (value ?? "").trim().replace(/[\s-]+/g, "_"),
    ),
  );
}
