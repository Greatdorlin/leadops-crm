export type FormTemplateFieldDefinition = {
  fieldType:
    | "text"
    | "email"
    | "phone"
    | "number"
    | "select"
    | "checkbox"
    | "radio"
    | "textarea"
    | "date"
    | "file";
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  mapsToLeadField?: string | null;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | null;
};

export type FormTemplateDefinition = {
  key: string;
  label: string;
  tagline: string;
  description: string;
  visualStyle: string;
  backgroundPreset: string;
  suggestedName: string;
  suggestedSlug: string;
  defaultStatus: string;
  defaultPriority: string;
  defaultSource: string;
  successMessage: string;
  fields: FormTemplateFieldDefinition[];
};

function createLeadBasics(extraFields: FormTemplateFieldDefinition[] = []) {
  return [
    {
      fieldType: "text" as const,
      label: "Full name",
      placeholder: "Ada Okafor",
      isRequired: true,
      mapsToLeadField: "firstName",
    },
    {
      fieldType: "email" as const,
      label: "Work email",
      placeholder: "ada@company.com",
      isRequired: true,
      mapsToLeadField: "email",
    },
    {
      fieldType: "phone" as const,
      label: "Phone or WhatsApp",
      placeholder: "+1 415 555 0182",
      isRequired: true,
      mapsToLeadField: "whatsappNumber",
    },
    {
      fieldType: "text" as const,
      label: "Country",
      placeholder: "United States",
      isRequired: true,
      mapsToLeadField: "country",
    },
    {
      fieldType: "text" as const,
      label: "Region or state",
      placeholder: "California",
      mapsToLeadField: "region",
    },
    {
      fieldType: "text" as const,
      label: "City",
      placeholder: "San Francisco",
      mapsToLeadField: "city",
    },
    ...extraFields,
  ];
}

export function slugifyFormName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export const FORM_TEMPLATES: FormTemplateDefinition[] = [
  {
    key: "blank",
    label: "Blank form",
    tagline: "Start from scratch",
    description: "Create a custom intake flow with your own fields and routing.",
    visualStyle: "Liquid Glass Lead Capture",
    backgroundPreset: "Butterfly Glass",
    suggestedName: "New intake form",
    suggestedSlug: "new-intake-form",
    defaultStatus: "new",
    defaultPriority: "medium",
    defaultSource: "website_form",
    successMessage: "Thanks. Your request is now inside the Leads Desk workspace.",
    fields: [],
  },
  {
    key: "general_contact",
    label: "General Contact",
    tagline: "Clean first-touch capture",
    description: "Short intake for general enquiries and routing into the main queue.",
    visualStyle: "Minimal Premium",
    backgroundPreset: "Butterfly Glass",
    suggestedName: "General contact form",
    suggestedSlug: "general-contact",
    defaultStatus: "new",
    defaultPriority: "medium",
    defaultSource: "website_form",
    successMessage: "Thanks. Your request is now inside the Leads Desk workspace.",
    fields: createLeadBasics([
      {
        fieldType: "textarea",
        label: "How can we help?",
        placeholder: "Tell us what you need help with.",
        isRequired: true,
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "sales_inquiry",
    label: "Sales Inquiry",
    tagline: "Qualified pipeline intake",
    description: "Capture budget fit, timeline, and the offer a lead is interested in.",
    visualStyle: "Executive Dark Luxury",
    backgroundPreset: "Midnight Horizon",
    suggestedName: "Sales inquiry form",
    suggestedSlug: "sales-inquiry",
    defaultStatus: "contacted",
    defaultPriority: "high",
    defaultSource: "website_form",
    successMessage: "Thanks. A sales owner will review this request shortly.",
    fields: createLeadBasics([
      {
        fieldType: "select",
        label: "Offer interest",
        isRequired: true,
        mapsToLeadField: "customField_offer_interest",
        options: [
          { label: "Private CRM setup", value: "private_crm_setup" },
          { label: "Lead operations overhaul", value: "lead_operations_overhaul" },
          { label: "Campaign reporting system", value: "campaign_reporting_system" },
        ],
      },
      {
        fieldType: "select",
        label: "Budget fit",
        isRequired: true,
        mapsToLeadField: "customField_budget_fit",
        options: [
          { label: "Ready now", value: "ready_now" },
          { label: "Needs lower entry offer", value: "lower_entry_offer" },
          { label: "Still exploring", value: "exploring" },
        ],
      },
      {
        fieldType: "textarea",
        label: "What outcome do you want?",
        placeholder: "Share the workflow, targets, or pain points.",
        isRequired: true,
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "real_estate_inquiry",
    label: "Real Estate Inquiry",
    tagline: "Property lead capture",
    description: "Capture deal intent, budget range, and preferred location.",
    visualStyle: "Vertical Preset",
    backgroundPreset: "Botanical Bloom",
    suggestedName: "Real estate inquiry",
    suggestedSlug: "real-estate-inquiry",
    defaultStatus: "contacted",
    defaultPriority: "high",
    defaultSource: "website_form",
    successMessage: "Thanks. A property advisor will review this enquiry.",
    fields: createLeadBasics([
      {
        fieldType: "select",
        label: "Property type",
        isRequired: true,
        mapsToLeadField: "customField_property_type",
        options: [
          { label: "Residential", value: "residential" },
          { label: "Commercial", value: "commercial" },
          { label: "Land", value: "land" },
        ],
      },
      {
        fieldType: "number",
        label: "Budget",
        placeholder: "250000",
        mapsToLeadField: "customField_budget_amount",
      },
      {
        fieldType: "textarea",
        label: "Preferred location or requirements",
        placeholder: "Share what the client wants to buy or rent.",
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "insurance_quote",
    label: "Insurance Quote",
    tagline: "Quote request intake",
    description: "Capture coverage type, preferred timing, and fit signals for follow-up.",
    visualStyle: "Solid Business",
    backgroundPreset: "Dark Luxury",
    suggestedName: "Insurance quote request",
    suggestedSlug: "insurance-quote-request",
    defaultStatus: "contacted",
    defaultPriority: "medium",
    defaultSource: "website_form",
    successMessage: "Thanks. Your quote request is in review.",
    fields: createLeadBasics([
      {
        fieldType: "select",
        label: "Coverage type",
        isRequired: true,
        mapsToLeadField: "customField_coverage_type",
        options: [
          { label: "Health", value: "health" },
          { label: "Life", value: "life" },
          { label: "Auto", value: "auto" },
          { label: "Property", value: "property" },
        ],
      },
      {
        fieldType: "textarea",
        label: "Current situation",
        placeholder: "Anything that should shape the quote or fit decision.",
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "training_course_interest",
    label: "Training / Course Interest",
    tagline: "Education lead routing",
    description: "Capture course interest, readiness, and urgency for follow-up.",
    visualStyle: "Liquid Glass Lead Capture",
    backgroundPreset: "Butterfly Glass",
    suggestedName: "Training interest form",
    suggestedSlug: "training-interest",
    defaultStatus: "new",
    defaultPriority: "medium",
    defaultSource: "website_form",
    successMessage: "Thanks. We’ll review the best next step for this enquiry.",
    fields: createLeadBasics([
      {
        fieldType: "text",
        label: "Course or program",
        isRequired: true,
        mapsToLeadField: "customField_program_interest",
      },
      {
        fieldType: "select",
        label: "Start timeline",
        mapsToLeadField: "customField_start_timeline",
        options: [
          { label: "This month", value: "this_month" },
          { label: "Next 3 months", value: "next_3_months" },
          { label: "Later", value: "later" },
        ],
      },
      {
        fieldType: "textarea",
        label: "Learning goal",
        placeholder: "What result does the lead want from this training?",
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "healthcare_appointment_request",
    label: "Healthcare Appointment Request",
    tagline: "Appointment intake",
    description: "Capture appointment details cleanly without exposing internal operations.",
    visualStyle: "Executive Dark Luxury",
    backgroundPreset: "Midnight Horizon",
    suggestedName: "Appointment request form",
    suggestedSlug: "appointment-request",
    defaultStatus: "contacted",
    defaultPriority: "high",
    defaultSource: "website_form",
    successMessage: "Thanks. Your appointment request is in the queue.",
    fields: createLeadBasics([
      {
        fieldType: "select",
        label: "Service needed",
        isRequired: true,
        mapsToLeadField: "customField_service_type",
        options: [
          { label: "Consultation", value: "consultation" },
          { label: "Follow-up", value: "follow_up" },
          { label: "Procedure enquiry", value: "procedure_enquiry" },
        ],
      },
      {
        fieldType: "date",
        label: "Preferred appointment date",
        mapsToLeadField: "customField_preferred_date",
      },
      {
        fieldType: "textarea",
        label: "Notes for the team",
        placeholder: "Add symptoms, context, or special requests if needed.",
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "service_request",
    label: "Service Request",
    tagline: "Operations-ready intake",
    description: "Capture the service type, urgency, and scope before a rep picks it up.",
    visualStyle: "Solid Business",
    backgroundPreset: "Dark Luxury",
    suggestedName: "Service request form",
    suggestedSlug: "service-request",
    defaultStatus: "contacted",
    defaultPriority: "medium",
    defaultSource: "website_form",
    successMessage: "Thanks. Your request has been logged for follow-up.",
    fields: createLeadBasics([
      {
        fieldType: "text",
        label: "Requested service",
        isRequired: true,
        mapsToLeadField: "customField_service_type",
      },
      {
        fieldType: "select",
        label: "Urgency",
        mapsToLeadField: "customField_urgency",
        options: [
          { label: "Immediate", value: "immediate" },
          { label: "This week", value: "this_week" },
          { label: "This month", value: "this_month" },
        ],
      },
      {
        fieldType: "textarea",
        label: "Scope or request summary",
        placeholder: "Describe what needs to happen next.",
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "legal_consultation",
    label: "Legal Consultation",
    tagline: "High-trust consult intake",
    description: "Capture matter type, timeline, and a concise summary for review.",
    visualStyle: "Executive Dark Luxury",
    backgroundPreset: "Midnight Horizon",
    suggestedName: "Legal consultation request",
    suggestedSlug: "legal-consultation",
    defaultStatus: "qualified",
    defaultPriority: "high",
    defaultSource: "website_form",
    successMessage: "Thanks. Your consultation request is now under review.",
    fields: createLeadBasics([
      {
        fieldType: "text",
        label: "Matter type",
        isRequired: true,
        mapsToLeadField: "customField_matter_type",
      },
      {
        fieldType: "textarea",
        label: "Case summary",
        placeholder: "Share the essentials so the team can qualify the matter correctly.",
        isRequired: true,
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
  {
    key: "event_registration",
    label: "Event Registration",
    tagline: "Registration capture",
    description: "Capture attendance details and route registrants into the right follow-up flow.",
    visualStyle: "Minimal Premium",
    backgroundPreset: "Cyberpunk Minimal",
    suggestedName: "Event registration form",
    suggestedSlug: "event-registration",
    defaultStatus: "new",
    defaultPriority: "low",
    defaultSource: "website_form",
    successMessage: "Thanks. Your registration has been received.",
    fields: createLeadBasics([
      {
        fieldType: "text",
        label: "Company",
        mapsToLeadField: "companyName",
      },
      {
        fieldType: "select",
        label: "Attendance type",
        mapsToLeadField: "customField_attendance_type",
        options: [
          { label: "In person", value: "in_person" },
          { label: "Virtual", value: "virtual" },
        ],
      },
    ]),
  },
  {
    key: "travel_education_consultation",
    label: "Travel / Education Consultation",
    tagline: "Consultation capture",
    description: "Capture destination, timing, and consultation fit without exposing legacy product language.",
    visualStyle: "Vertical Preset",
    backgroundPreset: "Botanical Bloom",
    suggestedName: "Consultation request form",
    suggestedSlug: "consultation-request",
    defaultStatus: "contacted",
    defaultPriority: "medium",
    defaultSource: "website_form",
    successMessage: "Thanks. Your consultation request is now in review.",
    fields: createLeadBasics([
      {
        fieldType: "text",
        label: "Preferred destination or market",
        mapsToLeadField: "customField_destination_interest",
      },
      {
        fieldType: "select",
        label: "Timeline",
        mapsToLeadField: "customField_start_timeline",
        options: [
          { label: "Immediately", value: "immediately" },
          { label: "Within 3 months", value: "within_3_months" },
          { label: "Later", value: "later" },
        ],
      },
      {
        fieldType: "textarea",
        label: "What outcome are you aiming for?",
        placeholder: "Share the type of help the lead expects.",
        mapsToLeadField: "customField_request_summary",
      },
    ]),
  },
];

export function getFormTemplateByKey(key: string) {
  return FORM_TEMPLATES.find((template) => template.key === key) ?? FORM_TEMPLATES[0];
}
