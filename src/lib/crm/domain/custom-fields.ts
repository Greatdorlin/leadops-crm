export const CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "currency",
  "date",
  "datetime",
  "select",
  "multi_select",
  "checkbox",
  "phone",
  "email",
  "url",
  "user_reference",
  "file_url",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  description: string | null;
  placeholder: string | null;
  required: boolean;
  archived: boolean;
  showInTable: boolean;
  showInForm: boolean;
  showInDetails: boolean;
  searchable: boolean;
  filterable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldOption {
  id: string;
  customFieldId: string;
  label: string;
  value: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface LeadCustomFieldValue {
  id: string;
  leadId: string;
  customFieldId: string;
  value: unknown;
  displayValue: string | null;
  createdAt: string;
  updatedAt: string;
}
