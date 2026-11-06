export function displaySavedFormAnswers(
  fields: ReadonlyArray<{ id: string; label: string }>,
  data: Record<string, unknown>,
) {
  return fields.flatMap(field => {
    const answer = data[field.id];
    const values = Array.isArray(answer) ? answer : [answer];
    const text = values.filter(value => ["string", "number", "boolean"].includes(typeof value))
      .map(value => typeof value === "boolean" ? (value ? "Yes" : "No") : String(value))
      .filter(value => value.trim()).join(", ");
    return text ? [{ label: field.label, value: text.slice(0, 4000) }] : [];
  });
}
