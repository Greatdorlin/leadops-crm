import { pgEnum } from "drizzle-orm/pg-core";
import {
  CRM_USER_ROLES,
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUSES,
  LEAD_PRIORITIES,
  SOURCE_PAYLOAD_PROCESSING_STATUSES,
  SYNC_JOB_STATUSES,
} from "@/lib/crm/constants";
import {
  CUSTOM_FIELD_TYPES,
  FORM_FIELD_CORE_TARGETS,
  FORM_FIELD_TARGET_TYPES,
  FORM_SOURCE_TYPES,
  LEAD_INTAKE_EVENT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  SALES_TARGET_PERIODS,
  SALES_TARGET_SCOPES,
} from "@/lib/crm/domain";

export const leadPriorityEnum = pgEnum("lead_priority", LEAD_PRIORITIES);

export const crmUserRoleEnum = pgEnum("crm_user_role", CRM_USER_ROLES);

export const sourcePayloadProcessingStatusEnum = pgEnum(
  "source_payload_processing_status",
  SOURCE_PAYLOAD_PROCESSING_STATUSES,
);

export const integrationProviderEnum = pgEnum(
  "integration_provider",
  INTEGRATION_PROVIDERS,
);

export const integrationStatusEnum = pgEnum(
  "integration_status",
  INTEGRATION_STATUSES,
);

export const syncJobStatusEnum = pgEnum("sync_job_status", SYNC_JOB_STATUSES);

export const customFieldTypeEnum = pgEnum(
  "custom_field_type",
  CUSTOM_FIELD_TYPES,
);

export const formSourceTypeEnum = pgEnum("form_source_type", FORM_SOURCE_TYPES);

export const formFieldTargetTypeEnum = pgEnum(
  "form_field_target_type",
  FORM_FIELD_TARGET_TYPES,
);

export const formFieldCoreTargetEnum = pgEnum(
  "form_field_core_target",
  FORM_FIELD_CORE_TARGETS,
);

export const leadIntakeEventStatusEnum = pgEnum(
  "lead_intake_event_status",
  LEAD_INTAKE_EVENT_STATUSES,
);

export const notificationTypeEnum = pgEnum(
  "notification_type",
  NOTIFICATION_TYPES,
);

export const notificationChannelEnum = pgEnum(
  "notification_channel",
  NOTIFICATION_CHANNELS,
);

export const notificationStatusEnum = pgEnum(
  "notification_status",
  NOTIFICATION_STATUSES,
);

export const salesTargetScopeEnum = pgEnum(
  "sales_target_scope",
  SALES_TARGET_SCOPES,
);

export const salesTargetPeriodEnum = pgEnum(
  "sales_target_period",
  SALES_TARGET_PERIODS,
);

export const leadOpportunityStatusEnum = pgEnum("lead_opportunity_status", [
  "active",
  "qualified",
  "unqualified",
  "lost",
  "won",
  "on_hold",
]);
