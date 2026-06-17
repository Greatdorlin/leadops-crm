export function calculateProgressPercent(currentStepIndex: number, totalSteps: number) {
  if (totalSteps <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(((currentStepIndex + 1) / totalSteps) * 100)));
}
