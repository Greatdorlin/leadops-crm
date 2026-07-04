export interface IndustryPreset {
  id: string;
  name: string;
  description: string;
  stages: Array<{ label: string; value: string; color?: string }>;
  sources: Array<{ label: string; value: string }>;
  customFields: Array<{
    fieldType: string;
    label: string;
    placeholder?: string;
    helpText?: string;
    isRequired: boolean;
    options?: { label: string; value: string }[];
  }>;
  leadPreviewFields: string[];
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
      { label: "Zillow", value: "zillow" },
      { label: "Walk-in", value: "walk_in" },
      { label: "Social Media", value: "social_media" },
      { label: "Open House", value: "open_house" },
    ],
    customFields: [
      { fieldType: "number", label: "Budget", placeholder: "e.g. 500000", helpText: "Maximum budget in workspace currency", isRequired: true },
      { fieldType: "select", label: "Property Type", isRequired: true, options: [
        { label: "Apartment", value: "apartment" },
        { label: "House", value: "house" },
        { label: "Commercial", value: "commercial" },
        { label: "Land", value: "land" },
      ]},
      { fieldType: "text", label: "Preferred Location", placeholder: "e.g. Lekki, Lagos", isRequired: false },
      { fieldType: "select", label: "Bedrooms", isRequired: false, options: [
        { label: "Studio", value: "studio" },
        { label: "1 Bedroom", value: "1" },
        { label: "2 Bedrooms", value: "2" },
        { label: "3 Bedrooms", value: "3" },
        { label: "4+ Bedrooms", value: "4+" },
      ]},
      { fieldType: "select", label: "Timeline", isRequired: false, options: [
        { label: "Immediate", value: "immediate" },
        { label: "1-3 Months", value: "1_3_months" },
        { label: "3-6 Months", value: "3_6_months" },
        { label: "6+ Months", value: "6+_months" },
      ]},
    ],
    leadPreviewFields: ["firstName", "lastName", "email", "budget", "propertyType", "preferredLocation", "timeline"],
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
      { fieldType: "text", label: "Destination", placeholder: "e.g. Paris, France", isRequired: true },
      { fieldType: "text", label: "Travel Dates", placeholder: "e.g. Dec 15 - Dec 22", isRequired: true },
      { fieldType: "number", label: "Budget", placeholder: "e.g. 5000", isRequired: true },
      { fieldType: "select", label: "Travelers", isRequired: false, options: [
        { label: "Solo", value: "solo" },
        { label: "Couple", value: "couple" },
        { label: "Family", value: "family" },
        { label: "Group", value: "group" },
      ]},
      { fieldType: "select", label: "Trip Type", isRequired: false, options: [
        { label: "Leisure", value: "leisure" },
        { label: "Business", value: "business" },
        { label: "Honeymoon", value: "honeymoon" },
        { label: "Adventure", value: "adventure" },
        { label: "Cruise", value: "cruise" },
      ]},
    ],
    leadPreviewFields: ["firstName", "lastName", "email", "destination", "travelDates", "budget", "tripType"],
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
      { fieldType: "select", label: "Service Type", isRequired: true, options: [
        { label: "Consulting", value: "consulting" },
        { label: "Design", value: "design" },
        { label: "Development", value: "development" },
        { label: "Marketing", value: "marketing" },
        { label: "Maintenance", value: "maintenance" },
      ]},
      { fieldType: "number", label: "Budget", placeholder: "e.g. 10000", isRequired: true },
      { fieldType: "select", label: "Timeline", isRequired: false, options: [
        { label: "Immediate", value: "immediate" },
        { label: "1-2 Weeks", value: "1_2_weeks" },
        { label: "1 Month", value: "1_month" },
        { label: "3 Months", value: "3_months" },
        { label: "Flexible", value: "flexible" },
      ]},
      { fieldType: "select", label: "Urgency", isRequired: false, options: [
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
    leadPreviewFields: ["firstName", "lastName", "email", "serviceType", "budget", "timeline", "urgency"],
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
