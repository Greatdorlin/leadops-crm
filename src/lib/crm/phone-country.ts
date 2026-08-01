export interface PhoneCountryProfile {
  dialCode: string;
  example: string;
}

const PHONE_COUNTRY_PROFILES: Record<string, PhoneCountryProfile> = {
  nigeria: { dialCode: "+234", example: "+234 801 234 5678" },
  ghana: { dialCode: "+233", example: "+233 24 123 4567" },
  kenya: { dialCode: "+254", example: "+254 712 345 678" },
  "south africa": { dialCode: "+27", example: "+27 82 123 4567" },
  "united kingdom": { dialCode: "+44", example: "+44 7700 900123" },
  uk: { dialCode: "+44", example: "+44 7700 900123" },
  "united states": { dialCode: "+1", example: "+1 415 555 0132" },
  usa: { dialCode: "+1", example: "+1 415 555 0132" },
  canada: { dialCode: "+1", example: "+1 416 555 0132" },
  india: { dialCode: "+91", example: "+91 98765 43210" },
  australia: { dialCode: "+61", example: "+61 412 345 678" },
  "united arab emirates": { dialCode: "+971", example: "+971 50 123 4567" },
  uae: { dialCode: "+971", example: "+971 50 123 4567" },
};

const GLOBAL_PHONE_PROFILE: PhoneCountryProfile = {
  dialCode: "+",
  example: "+[country code] [number]",
};

export function getPhoneCountryProfile(country?: string | null): PhoneCountryProfile {
  const normalized = country?.trim().toLowerCase();
  return (normalized && PHONE_COUNTRY_PROFILES[normalized]) || GLOBAL_PHONE_PROFILE;
}

export function isValidInternationalPhone(value?: string | null) {
  if (!value?.trim()) return true;
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
