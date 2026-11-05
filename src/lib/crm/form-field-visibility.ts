import { evaluateSubmissionCondition } from "./form-submission-routing";

type ConditionalField = {
  id: string;
  isVisible?: boolean;
  showWhen?: Record<string, unknown> | null;
};

export function resolveVisibleFormFields<T extends ConditionalField>(
  fields: readonly T[],
  readAnswer: (field: T) => unknown,
) {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const resolved = new Map<string, boolean>();

  function isVisible(field: T): boolean {
    if (resolved.has(field.id)) return resolved.get(field.id) === true;
    // Treat a dependency as hidden until resolved so cycles cannot expose fields.
    resolved.set(field.id, false);
    if (field.isVisible === false) return false;

    const condition = field.showWhen;
    if (!condition || Object.keys(condition).length === 0) {
      resolved.set(field.id, true);
      return true;
    }

    const controller = typeof condition.fieldId === "string" ? byId.get(condition.fieldId) : undefined;
    const visible = Boolean(controller && isVisible(controller) && typeof condition.operator === "string"
      && evaluateSubmissionCondition(
        readAnswer(controller),
        condition.operator,
        typeof condition.value === "string" ? condition.value : null,
      ));
    resolved.set(field.id, visible);
    return visible;
  }

  return fields.filter(isVisible);
}
