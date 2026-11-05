export const STANDARD_WEBHOOK_MAPPINGS = [
  { externalFieldName: "name", externalFieldLabel: "Name", targetType: "core", targetField: "name", required: false },
  { externalFieldName: "email", externalFieldLabel: "Email", targetType: "core", targetField: "email", required: false },
  { externalFieldName: "phone", externalFieldLabel: "Phone", targetType: "core", targetField: "phone", required: false },
] as const;
