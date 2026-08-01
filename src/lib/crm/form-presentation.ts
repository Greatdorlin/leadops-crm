export const FORM_PRESENTATION_MODES = ["standard", "step"] as const;

export type FormPresentationMode = (typeof FORM_PRESENTATION_MODES)[number];

export function resolveFormPresentationMode(value: string): FormPresentationMode {
  return (FORM_PRESENTATION_MODES as readonly string[]).includes(value)
    ? (value as FormPresentationMode)
    : "standard";
}

export function clampFormStep(step: number, fieldCount: number) {
  if (fieldCount <= 0) return 0;
  return Math.min(Math.max(0, step), fieldCount - 1);
}

export function getFormStepProgress(step: number, fieldCount: number) {
  if (fieldCount <= 0) return 100;
  return Math.round(((clampFormStep(step, fieldCount) + 1) / fieldCount) * 100);
}
