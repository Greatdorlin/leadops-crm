import { DEFAULT_LEADS_DESK_STAGE_ROWS } from "@/lib/db/defaults";

export const STARTER_INDUSTRY_STAGES = DEFAULT_LEADS_DESK_STAGE_ROWS
  .filter((stage) => stage.key !== "follow_up")
  .map(({ key, name, color }) => ({ value: key, label: name, color }));
