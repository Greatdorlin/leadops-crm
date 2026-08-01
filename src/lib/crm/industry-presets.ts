import type { CustomFieldType } from "./domain/custom-fields";

export interface IndustryPresetCustomField {
  key?: string;
  fieldType: CustomFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  searchable?: boolean;
  filterable?: boolean;
  showInTable?: boolean;
  options?: { label: string; value: string }[];
}

export interface IndustryPreset {
  id: string;
  name: string;
  description: string;
  stages: Array<{ label: string; value: string; color?: string }>;
  sources: Array<{ label: string; value: string }>;
  customFields: IndustryPresetCustomField[];
  leadPreviewFields: string[];
}

export function buildIndustryPresetFieldKey(field: Pick<IndustryPresetCustomField, "key" | "label">) {
  return field.key ?? field.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: "real_estate",
    name: "Real Estate",
    description: "Property sales, rentals, and client management.",
    stages: [
      { label: "New Lead", value: "new", color: "#94a3b8" },
      { label: "Qualified", value: "qualified", color: "#3b82f6" },
      { label: "Property Viewing", value: "viewing", color: "#8b5cf6" },
      { label: "Offer Made", value: "offer_made", color: "#f59e0b" },
      { label: "Contract Signed", value: "contract_signed", color: "#10b981" },
      { label: "Closed", value: "closed", color: "#059669" },
    ],
    sources: [
      { label: "Website", value: "website" },
      { label: "Referral", value: "referral" },
      { label: "Property Listing Portal", value: "property_listing_portal" },
      { label: "Walk-in", value: "walk_in" },
      { label: "Social Media", value: "social_media" },
      { label: "Open House", value: "open_house" },
    ],
    customFields: [
      { fieldType: "currency", label: "Budget", placeholder: "Enter the maximum budget", helpText: "Maximum budget in workspace currency", isRequired: true, filterable: true },
      { fieldType: "select", label: "Property Type", isRequired: true, filterable: true, options: [
        { label: "Apartment", value: "apartment" },
        { label: "House", value: "house" },
        { label: "Commercial", value: "commercial" },
        { label: "Land", value: "land" },
      ]},
      { fieldType: "text", label: "Preferred Location", placeholder: "e.g. neighbourhood, city, or region", isRequired: false, searchable: true, filterable: true },
      { fieldType: "select", label: "Bedrooms", isRequired: false, filterable: true, options: [
        { label: "Studio", value: "studio" },
        { label: "1 Bedroom", value: "1" },
        { label: "2 Bedrooms", value: "2" },
        { label: "3 Bedrooms", value: "3" },
        { label: "4+ Bedrooms", value: "4+" },
      ]},
      { fieldType: "select", label: "Purchase Timeline", isRequired: false, filterable: true, options: [
        { label: "Immediate", value: "immediate" },
        { label: "1-3 Months", value: "1_3_months" },
        { label: "3-6 Months", value: "3_6_months" },
        { label: "6+ Months", value: "6+_months" },
      ]},
    ],
    leadPreviewFields: ["Name", "Email", "Budget", "Property Type", "Preferred Location", "Purchase Timeline"],
  },
  {
    id: "travel",
    name: "Travel & Tours",
    description: "Travel bookings, tour packages, and vacation planning.",
    stages: [
      { label: "Inquiry", value: "new", color: "#94a3b8" },
      { label: "Quoted", value: "quoted", color: "#3b82f6" },
      { label: "Consultation Booked", value: "consultation_booked", color: "#8b5cf6" },
      { label: "Deposit Paid", value: "deposit_paid", color: "#f59e0b" },
      { label: "Documents Ready", value: "documents_ready", color: "#10b981" },
      { label: "Departed", value: "departed", color: "#059669" },
    ],
    sources: [
      { label: "Website", value: "website" },
      { label: "Facebook", value: "facebook" },
      { label: "Instagram", value: "instagram" },
      { label: "Referral", value: "referral" },
      { label: "Travel Agent", value: "travel_agent" },
      { label: "Walk-in", value: "walk_in" },
    ],
    customFields: [
      { key: "destination", fieldType: "text", label: "Destination", placeholder: "e.g. city, country, or tour", isRequired: true, searchable: true, filterable: true, showInTable: true },
      { key: "journey_type", fieldType: "select", label: "Journey Type", helpText: "Choose whether the itinerary ends at the destination or includes a return journey.", isRequired: true, filterable: true, showInTable: true, options: [
        { label: "One-way", value: "one_way" },
        { label: "Return", value: "return" },
      ]},
      { key: "departure_date", fieldType: "date", label: "Departure Date", helpText: "Date the traveller leaves the origin.", isRequired: true, filterable: true, showInTable: true },
      { key: "arrival_date", fieldType: "date", label: "Arrival Date", helpText: "Date the traveller arrives at the destination.", isRequired: true, filterable: true },
      { key: "return_date", fieldType: "date", label: "Return Date", helpText: "Required for return journeys; leave blank for one-way itineraries.", isRequired: false, filterable: true },
      { key: "traveller_count", fieldType: "number", label: "Traveller Count", placeholder: "e.g. 2", helpText: "Total number of adults and children travelling.", isRequired: true, filterable: true },
      { key: "budget", fieldType: "currency", label: "Trip Budget", placeholder: "Enter the total trip budget", helpText: "Total budget in workspace currency.", isRequired: true, filterable: true },
      { key: "trip_purpose", fieldType: "select", label: "Trip Purpose", isRequired: false, filterable: true, options: [
        { label: "Leisure", value: "leisure" },
        { label: "Business", value: "business" },
        { label: "Honeymoon", value: "honeymoon" },
        { label: "Adventure", value: "adventure" },
        { label: "Cruise", value: "cruise" },
      ]},
    ],
    leadPreviewFields: ["Name", "Destination", "Journey Type", "Departure Date", "Return Date", "Trip Budget"],
  },
  {
    id: "service",
    name: "Service Business",
    description: "Consulting, agency, home services, and professional services.",
    stages: [
      { label: "Inquiry", value: "new", color: "#94a3b8" },
      { label: "Qualified", value: "qualified", color: "#3b82f6" },
      { label: "Quote Sent", value: "quote_sent", color: "#8b5cf6" },
      { label: "Contract Signed", value: "contract_signed", color: "#f59e0b" },
      { label: "In Progress", value: "in_progress", color: "#10b981" },
      { label: "Completed", value: "completed", color: "#059669" },
    ],
    sources: [
      { label: "Website", value: "website" },
      { label: "Google Ads", value: "google_ads" },
      { label: "Referral", value: "referral" },
      { label: "Social Media", value: "social_media" },
      { label: "Cold Call", value: "cold_call" },
      { label: "Event", value: "event" },
    ],
    customFields: [
      { fieldType: "select", label: "Service Type", isRequired: true, filterable: true, options: [
        { label: "Consulting", value: "consulting" },
        { label: "Design", value: "design" },
        { label: "Development", value: "development" },
        { label: "Marketing", value: "marketing" },
        { label: "Maintenance", value: "maintenance" },
      ]},
      { fieldType: "currency", label: "Budget", placeholder: "Enter the available budget", helpText: "Available budget in workspace currency.", isRequired: true, filterable: true },
      { fieldType: "select", label: "Delivery Timeline", isRequired: false, filterable: true, options: [
        { label: "Immediate", value: "immediate" },
        { label: "1-2 Weeks", value: "1_2_weeks" },
        { label: "1 Month", value: "1_month" },
        { label: "3 Months", value: "3_months" },
        { label: "Flexible", value: "flexible" },
      ]},
      { fieldType: "select", label: "Urgency", isRequired: false, filterable: true, options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ]},
      { fieldType: "select", label: "Preferred Contact Method", isRequired: false, options: [
        { label: "Email", value: "email" },
        { label: "Phone", value: "phone" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Video Call", value: "video_call" },
      ]},
    ],
    leadPreviewFields: ["Name", "Email", "Service Type", "Budget", "Delivery Timeline", "Urgency"],
  },
];

import { ADDITIONAL_INDUSTRY_PRESETS } from "./industry-presets-additional";

export const ALL_INDUSTRY_PRESETS: IndustryPreset[] = [
  ...INDUSTRY_PRESETS,
  ...ADDITIONAL_INDUSTRY_PRESETS,
];

export function getIndustryPreset(id: string): IndustryPreset | undefined {
  return ALL_INDUSTRY_PRESETS.find((p) => p.id === id);
}
