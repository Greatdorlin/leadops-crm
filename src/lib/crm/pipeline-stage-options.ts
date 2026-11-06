export const PRODUCT_QUALIFICATION_ACTION = "__product_qualification__";
export const CORE_PIPELINE_STAGE_KEYS = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
type Choice = { value: string; key?: string; label: string };
export function partitionPipelineStageOptions<T extends Choice>(
  options: T[],
  currentValue?: string,
) {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  const rank = (option: T) =>
    CORE_PIPELINE_STAGE_KEYS.indexOf(
      normalize(
        option.key || option.label,
      ) as (typeof CORE_PIPELINE_STAGE_KEYS)[number],
    );
  const primary = options
    .filter(
      (o) =>
        rank(o) >= 0 ||
        o.value === currentValue ||
        o.value === PRODUCT_QUALIFICATION_ACTION,
    )
    .sort(
      (a, b) => (rank(a) < 0 ? 99 : rank(a)) - (rank(b) < 0 ? 99 : rank(b)),
    );
  return { primary, additional: options.filter((o) => !primary.includes(o)) };
}
