import type { PatternNotificationDurableRecord } from "../storage/pattern-notification-relational-slice.js";
import type { RepositoryErrorCode } from "./repository-error.js";

export const PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_OPERATIONS = [
  "load_pattern_notification",
  "load_pattern_notification_by_deduplication_key",
  "list_pattern_notifications_by_delivery_status",
  "insert_pattern_notification",
  "update_pattern_notification"
] as const;
export type PatternNotificationRelationalAdapterOperation =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_OPERATIONS)[number];

export const PATTERN_NOTIFICATION_RELATIONAL_DETERMINISTIC_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference"
] as const;
export type PatternNotificationRelationalDeterministicErrorCode =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_DETERMINISTIC_ERROR_CODES)[number];

export const PATTERN_NOTIFICATION_RELATIONAL_RETRYABLE_ERROR_CODES = [
  "transient_failure",
  "unknown_failure"
] as const;
export type PatternNotificationRelationalRetryableErrorCode =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_RETRYABLE_ERROR_CODES)[number];

/** The evidence references an insert must resolve before a notification may be retained. */
export const PATTERN_NOTIFICATION_REFERENCE_KINDS = [
  "signal_candidate",
  "setup_definition",
  "setup_definition_revision",
  "monitored_symbol",
  "setup_aggregate_result"
] as const;
export type PatternNotificationReferenceKind =
  (typeof PATTERN_NOTIFICATION_REFERENCE_KINDS)[number];

export type PatternNotificationInsertRequest = {
  record: PatternNotificationDurableRecord;
};

/**
 * `expectedDeliveryStatus` and `expectedDeliveryAttemptedAtUtc` fence a delivery transition to the
 * exact state the caller read. They are what keeps a user-facing alert at-most-once when two
 * callers race, so a mismatch is a `version_mismatch` conflict, never a silent no-op.
 */
export type PatternNotificationUpdateRequest = {
  record: PatternNotificationDurableRecord;
  expectedVersion: number | null;
  expectedDeliveryStatus?: PatternNotificationDurableRecord["deliveryStatus"];
  expectedDeliveryAttemptedAtUtc?: string;
};

export type PatternNotificationDeliveryStatusQuery = {
  statuses: PatternNotificationDurableRecord["deliveryStatus"][];
  limit: number;
};

export type PatternNotificationRelationalAdapterErrorMapping = {
  deterministic: PatternNotificationRelationalDeterministicErrorCode[];
  retryable: PatternNotificationRelationalRetryableErrorCode[];
};

export const PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_ERROR_MAPPING:
  PatternNotificationRelationalAdapterErrorMapping = {
    deterministic: [...PATTERN_NOTIFICATION_RELATIONAL_DETERMINISTIC_ERROR_CODES],
    retryable: [...PATTERN_NOTIFICATION_RELATIONAL_RETRYABLE_ERROR_CODES]
  };

export type PatternNotificationRelationalRepositoryAdapter = {
  loadPatternNotification(
    notificationId: string
  ): Promise<PatternNotificationDurableRecord | null>;
  loadPatternNotificationByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationDurableRecord | null>;
  listPatternNotificationsByDeliveryStatus(
    query: PatternNotificationDeliveryStatusQuery
  ): Promise<PatternNotificationDurableRecord[]>;
  insertPatternNotification(
    request: PatternNotificationInsertRequest
  ): Promise<PatternNotificationDurableRecord>;
  updatePatternNotification(
    request: PatternNotificationUpdateRequest
  ): Promise<PatternNotificationDurableRecord>;
};

export const isPatternNotificationRelationalDeterministicErrorCode = (
  code: RepositoryErrorCode
): code is PatternNotificationRelationalDeterministicErrorCode =>
  PATTERN_NOTIFICATION_RELATIONAL_DETERMINISTIC_ERROR_CODES.includes(
    code as PatternNotificationRelationalDeterministicErrorCode
  );
