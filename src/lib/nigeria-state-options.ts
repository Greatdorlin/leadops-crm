export interface NigeriaStateOption {
  value: string;
  label: string;
  description?: string;
}

export const nigeriaStateOptions: NigeriaStateOption[] = [
  { value: "lagos", label: "Lagos" },
  { value: "abuja_fct", label: "Abuja (FCT)" },
  { value: "ogun_abeokuta", label: "Ogun (Abeokuta)" },
  { value: "oyo_ibadan", label: "Oyo (Ibadan)" },
  { value: "abia", label: "Abia" },
  { value: "adamawa", label: "Adamawa" },
  { value: "akwa_ibom", label: "Akwa Ibom" },
  { value: "anambra", label: "Anambra" },
  { value: "bauchi", label: "Bauchi" },
  { value: "bayelsa", label: "Bayelsa" },
  { value: "benue", label: "Benue" },
  { value: "borno", label: "Borno" },
  { value: "cross_river", label: "Cross River" },
  { value: "delta", label: "Delta" },
  { value: "ebonyi", label: "Ebonyi" },
  { value: "edo", label: "Edo" },
  { value: "ekiti", label: "Ekiti" },
  { value: "enugu", label: "Enugu" },
  { value: "gombe", label: "Gombe" },
  { value: "imo", label: "Imo" },
  { value: "jigawa", label: "Jigawa" },
  { value: "kaduna", label: "Kaduna" },
  { value: "kano", label: "Kano" },
  { value: "katsina", label: "Katsina" },
  { value: "kebbi", label: "Kebbi" },
  { value: "kogi", label: "Kogi" },
  { value: "kwara", label: "Kwara" },
  { value: "nasarawa", label: "Nasarawa" },
  { value: "niger", label: "Niger" },
  { value: "ondo", label: "Ondo" },
  { value: "osun", label: "Osun" },
  { value: "plateau", label: "Plateau" },
  { value: "rivers", label: "Rivers" },
  { value: "sokoto", label: "Sokoto" },
  { value: "taraba", label: "Taraba" },
  { value: "yobe", label: "Yobe" },
  { value: "zamfara", label: "Zamfara" },
];

function normalizeStateToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const nigeriaStateValueToLabel = new Map(
  nigeriaStateOptions.map((option) => [option.value, option.label]),
);

const nigeriaStateAliasToValue = new Map<string, string>();

for (const option of nigeriaStateOptions) {
  const aliases = [option.value, option.label];

  if (option.value === "abuja_fct") {
    aliases.push("Abuja", "FCT", "Federal Capital Territory", "Federal Capital Territory Abuja");
  }

  if (option.value === "ogun_abeokuta") {
    aliases.push("Abeokuta", "Ogun Abeokuta");
  }

  if (option.value === "oyo_ibadan") {
    aliases.push("Ibadan", "Oyo Ibadan");
  }

  for (const alias of aliases) {
    nigeriaStateAliasToValue.set(normalizeStateToken(alias), option.value);
  }
}

export function parseNigeriaStateValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = normalizeStateToken(value);
  if (!normalized) {
    return null;
  }

  return nigeriaStateAliasToValue.get(normalized) ?? null;
}

export function formatNigeriaStateLabel(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalizedValue = parseNigeriaStateValue(value) ?? value;
  return nigeriaStateValueToLabel.get(normalizedValue) ?? value.trim();
}
