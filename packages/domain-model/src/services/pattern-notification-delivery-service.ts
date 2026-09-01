import type { TimestampUtc } from "../common.js";
import {
  PATTERN_NOTIFICATION_DELIVERY_STATUSES,
  isPatternNotificationOutcomeCode,
  type PatternNotificationRecord
} from "../notification/pattern-notification-record.js";
import { RepositoryError } from "../repositories/repository-error.js";
import type { PatternNotificationRecordRepository } from "../repositories/pattern-notification-record-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type TerminalDeliveryStatus = Extract<
  PatternNotificationRecord["deliveryStatus"],
  "delivered" | "failed"
>;

export type RetainPatternNotificationRequest = {
  notification: PatternNotificationRecord;
  metadata: ProductRecordMetadata;
};

export type RetainPatternNotificationResult =
  | { status: "created"; notification: PatternNotificationRecord }
  | { status: "already_retained"; notification: PatternNotificationRecord };

export type ClaimPatternNotificationDeliveryRequest = {
  notificationId: string;
  attemptedAt: TimestampUtc;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type RecordPatternNotificationDeliveryOutcomeRequest = {
  notificationId: string;
  status: TerminalDeliveryStatus;
  completedAt: TimestampUtc;
  outcomeCode: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ReconcilePatternNotificationDeliveryRequest = {
  notificationId: string;
  reconciledAt: TimestampUtc;
  minAttemptAgeMs: number;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type ReconcilePatternNotificationDeliveryResult =
  | { status: "reconciled"; notification: PatternNotificationRecord }
  | { status: "not_found" }
  | { status: "not_stale"; notification: PatternNotificationRecord }
  | { status: "already_terminal"; notification: PatternNotificationRecord };

export type PatternNotificationDeliveryServiceDependencies = {
  patternNotificationRecordRepository: PatternNotificationRecordRepository;
};

export type PatternNotificationDeliveryService = {
  getById(notificationId: string): Promise<PatternNotificationRecord | null>;
  getByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationRecord | null>;
  listByDeliveryStatus(
    statuses: PatternNotificationRecord["deliveryStatus"][],
    limit: number
  ): Promise<PatternNotificationRecord[]>;
  retain(request: RetainPatternNotificationRequest): Promise<RetainPatternNotificationResult>;
  claimDeliveryAttempt(
    request: ClaimPatternNotificationDeliveryRequest
  ): Promise<PatternNotificationRecord | null>;
  recordDeliveryOutcome(
    request: RecordPatternNotificationDeliveryOutcomeRequest
  ): Promise<PatternNotificationRecord | null>;
  reconcileUnconfirmedDelivery(
    request: ReconcilePatternNotificationDeliveryRequest
  ): Promise<ReconcilePatternNotificationDeliveryResult>;
};

export class PatternNotificationDeliveryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatternNotificationDeliveryValidationError";
  }
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidTimestamp = (value: unknown): value is TimestampUtc =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const assertNonEmptyString = (value: unknown, fieldName: string): void => {
  if (!isNonEmptyString(value)) {
    throw new PatternNotificationDeliveryValidationError(`${fieldName} is required`);
  }
};

const assertTimestamp = (value: unknown, fieldName: string): void => {
  if (!isValidTimestamp(value)) {
    throw new PatternNotificationDeliveryValidationError(`${fieldName} must be a valid timestamp`);
  }
};

const assertPositiveInteger = (value: unknown, fieldName: string): void => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new PatternNotificationDeliveryValidationError(`${fieldName} must be a positive integer`);
  }
};

const assertPersistedNotification = (notification: PatternNotificationRecord): void => {
  const stringFields: (keyof PatternNotificationRecord)[] = [
    "notificationId",
    "deduplicationKey",
    "signalCandidateId",
    "setupDefinitionId",
    "setupRevisionId",
    "monitoredSymbolId",
    "setupAggregateResultId",
    "policyId"
  ];
  stringFields.forEach((field) => assertNonEmptyString(notification[field], field));
  ["observedAt", "aggregateComputedAt", "createdAtUtc", "updatedAtUtc"].forEach((field) =>
    assertTimestamp(notification[field as keyof PatternNotificationRecord], field)
  );

  if (notification.direction !== "consider_long") {
    throw new PatternNotificationDeliveryValidationError("direction is invalid");
  }
  if (!Number.isFinite(notification.currentPrice) || notification.currentPrice <= 0) {
    throw new PatternNotificationDeliveryValidationError("currentPrice must be positive");
  }
  if (!Number.isInteger(notification.completedEvaluations) || notification.completedEvaluations <= 0) {
    throw new PatternNotificationDeliveryValidationError("completedEvaluations must be positive");
  }
  if (
    !Number.isFinite(notification.positiveOutcomeRate) ||
    notification.positiveOutcomeRate < 0 ||
    notification.positiveOutcomeRate > 1 ||
    !Number.isFinite(notification.averagePercentageMove)
  ) {
    throw new PatternNotificationDeliveryValidationError("notification evidence metrics are invalid");
  }
  if (Date.parse(notification.createdAtUtc) < Date.parse(notification.observedAt)) {
    throw new PatternNotificationDeliveryValidationError(
      "createdAtUtc must not be before observedAt"
    );
  }
  if (Date.parse(notification.updatedAtUtc) < Date.parse(notification.createdAtUtc)) {
    throw new PatternNotificationDeliveryValidationError(
      "updatedAtUtc must not be before createdAtUtc"
    );
  }
  if (!PATTERN_NOTIFICATION_DELIVERY_STATUSES.includes(notification.deliveryStatus)) {
    throw new PatternNotificationDeliveryValidationError("deliveryStatus is invalid");
  }
  if (notification.deliveryAttemptedAt !== undefined) {
    assertTimestamp(notification.deliveryAttemptedAt, "deliveryAttemptedAt");
  }
  if (notification.completedAt !== undefined) {
    assertTimestamp(notification.completedAt, "completedAt");
  }
  if (notification.outcomeCode !== undefined && !isPatternNotificationOutcomeCode(notification.outcomeCode)) {
    throw new PatternNotificationDeliveryValidationError("outcomeCode is invalid");
  }
  if (
    notification.deliveryStatus === "pending_delivery" &&
    (notification.deliveryAttemptedAt !== undefined ||
      notification.completedAt !== undefined ||
      notification.outcomeCode !== undefined)
  ) {
    throw new PatternNotificationDeliveryValidationError(
      "pending pattern_notification cannot include delivery outcome evidence"
    );
  }
  if (
    notification.deliveryStatus === "delivery_attempted" &&
    (notification.deliveryAttemptedAt === undefined ||
      notification.completedAt !== undefined ||
      notification.outcomeCode !== undefined)
  ) {
    throw new PatternNotificationDeliveryValidationError(
      "delivery_attempted pattern_notification has invalid outcome evidence"
    );
  }
  if (
    (notification.deliveryStatus === "delivered" || notification.deliveryStatus === "failed") &&
    (notification.deliveryAttemptedAt === undefined ||
      notification.completedAt === undefined ||
      notification.outcomeCode === undefined)
  ) {
    throw new PatternNotificationDeliveryValidationError(
      "terminal pattern_notification requires delivery outcome evidence"
    );
  }
  if (
    notification.deliveryAttemptedAt !== undefined &&
    Date.parse(notification.deliveryAttemptedAt) < Date.parse(notification.observedAt)
  ) {
    throw new PatternNotificationDeliveryValidationError(
      "deliveryAttemptedAt must not be before observedAt"
    );
  }
  if (
    notification.completedAt !== undefined &&
    (notification.deliveryAttemptedAt === undefined ||
      Date.parse(notification.completedAt) < Date.parse(notification.deliveryAttemptedAt))
  ) {
    throw new PatternNotificationDeliveryValidationError(
      "completedAt must not be before deliveryAttemptedAt"
    );
  }
};

const assertNotification = (notification: PatternNotificationRecord): void => {
  assertPersistedNotification(notification);
  if (notification.deliveryStatus !== "pending_delivery") {
    throw new PatternNotificationDeliveryValidationError(
      "new pattern_notification must have pending_delivery status"
    );
  }
};

const buildUpdatedAt = (
  current: PatternNotificationRecord,
  eventAt: TimestampUtc,
  metadata: ProductRecordMetadata
): TimestampUtc => {
  const timestamps = [current.updatedAtUtc, eventAt, metadata.sourceObservedAtUtc].filter(
    (value): value is TimestampUtc => value !== null
  );
  return timestamps.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest
  );
};

export const createPatternNotificationDeliveryService = (
  dependencies: PatternNotificationDeliveryServiceDependencies
): PatternNotificationDeliveryService => {
  const { patternNotificationRecordRepository } = dependencies;

  return {
    async getById(notificationId) {
      const notification = await patternNotificationRecordRepository.getById(notificationId);
      if (notification) assertPersistedNotification(notification);
      return notification;
    },

    async getByDeduplicationKey(deduplicationKey) {
      const notification = await patternNotificationRecordRepository.getByDeduplicationKey(
        deduplicationKey
      );
      if (notification) assertPersistedNotification(notification);
      return notification;
    },

    async listByDeliveryStatus(statuses, limit) {
      assertPositiveInteger(limit, "limit");
      const notifications = await patternNotificationRecordRepository.listByDeliveryStatus(
        statuses,
        limit
      );
      notifications.forEach(assertPersistedNotification);
      return notifications.sort((left, right) =>
        left.notificationId.localeCompare(right.notificationId)
      );
    },

    async retain(request) {
      assertNotification(request.notification);
      const existing = await patternNotificationRecordRepository.getByDeduplicationKey(
        request.notification.deduplicationKey
      );
      if (existing) {
        assertPersistedNotification(existing);
        return { status: "already_retained", notification: existing };
      }
      try {
        const notification = await patternNotificationRecordRepository.create(request);
        return { status: "created", notification };
      } catch (error) {
        if (!(error instanceof RepositoryError) || error.code !== "already_exists") {
          throw error;
        }
        const retained = await patternNotificationRecordRepository.getByDeduplicationKey(
          request.notification.deduplicationKey
        );
        if (!retained) throw error;
        assertPersistedNotification(retained);
        return { status: "already_retained", notification: retained };
      }
    },

    async claimDeliveryAttempt(request) {
      assertNonEmptyString(request.notificationId, "notificationId");
      assertTimestamp(request.attemptedAt, "attemptedAt");
      const current = await patternNotificationRecordRepository.getById(request.notificationId);
      if (!current) return null;
      assertPersistedNotification(current);
      if (current.deliveryStatus !== "pending_delivery") {
        throw new PatternNotificationDeliveryValidationError(
          "pattern_notification delivery attempt is append-only"
        );
      }
      if (Date.parse(request.attemptedAt) < Date.parse(current.observedAt)) {
        throw new PatternNotificationDeliveryValidationError(
          "attemptedAt must not be before observedAt"
        );
      }

      return patternNotificationRecordRepository.update({
        notification: {
          ...current,
          deliveryStatus: "delivery_attempted",
          deliveryAttemptedAt: request.attemptedAt,
          updatedAtUtc: buildUpdatedAt(current, request.attemptedAt, request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion,
        expectedDeliveryStatus: "pending_delivery"
      });
    },

    async recordDeliveryOutcome(request) {
      assertNonEmptyString(request.notificationId, "notificationId");
      assertTimestamp(request.completedAt, "completedAt");
      if (!(["delivered", "failed"] as const).includes(request.status)) {
        throw new PatternNotificationDeliveryValidationError("delivery outcome status is invalid");
      }
      if (!isPatternNotificationOutcomeCode(request.outcomeCode)) {
        throw new PatternNotificationDeliveryValidationError(
          "outcomeCode must be a lowercase underscore-delimited identifier"
        );
      }
      const current = await patternNotificationRecordRepository.getById(request.notificationId);
      if (!current) return null;
      assertPersistedNotification(current);
      if (current.deliveryStatus !== "delivery_attempted" || !current.deliveryAttemptedAt) {
        throw new PatternNotificationDeliveryValidationError(
          "pattern_notification delivery outcome requires a claimed delivery attempt"
        );
      }
      if (Date.parse(request.completedAt) < Date.parse(current.deliveryAttemptedAt)) {
        throw new PatternNotificationDeliveryValidationError(
          "completedAt must not be before attemptedAt"
        );
      }

      return patternNotificationRecordRepository.update({
        notification: {
          ...current,
          deliveryStatus: request.status,
          completedAt: request.completedAt,
          outcomeCode: request.outcomeCode,
          updatedAtUtc: buildUpdatedAt(current, request.completedAt, request.metadata)
        },
        metadata: request.metadata,
        expectedVersion: request.expectedVersion,
        expectedDeliveryStatus: "delivery_attempted",
        expectedDeliveryAttemptedAt: current.deliveryAttemptedAt
      });
    },

    async reconcileUnconfirmedDelivery(request) {
      assertNonEmptyString(request.notificationId, "notificationId");
      assertTimestamp(request.reconciledAt, "reconciledAt");
      assertPositiveInteger(request.minAttemptAgeMs, "minAttemptAgeMs");
      const current = await patternNotificationRecordRepository.getById(request.notificationId);
      if (!current) return { status: "not_found" };
      assertPersistedNotification(current);
      if (current.deliveryStatus === "delivered" || current.deliveryStatus === "failed") {
        return { status: "already_terminal", notification: current };
      }
      if (current.deliveryStatus !== "delivery_attempted" || !current.deliveryAttemptedAt) {
        throw new PatternNotificationDeliveryValidationError(
          "pattern_notification reconciliation requires a claimed delivery attempt"
        );
      }
      const attemptAgeMs = Date.parse(request.reconciledAt) - Date.parse(current.deliveryAttemptedAt);
      if (attemptAgeMs < 0) {
        throw new PatternNotificationDeliveryValidationError(
          "reconciledAt must not be before attemptedAt"
        );
      }
      if (attemptAgeMs < request.minAttemptAgeMs) {
        return { status: "not_stale", notification: current };
      }

      try {
        const notification = await patternNotificationRecordRepository.update({
          notification: {
            ...current,
            deliveryStatus: "failed",
            completedAt: request.reconciledAt,
            outcomeCode: "delivery_outcome_unconfirmed",
            updatedAtUtc: buildUpdatedAt(current, request.reconciledAt, request.metadata)
          },
          metadata: request.metadata,
          expectedVersion: request.expectedVersion,
          expectedDeliveryStatus: "delivery_attempted",
          expectedDeliveryAttemptedAt: current.deliveryAttemptedAt
        });
        return { status: "reconciled", notification };
      } catch (error) {
        if (!(error instanceof RepositoryError) || error.code !== "version_mismatch") {
          throw error;
        }
        const updated = await patternNotificationRecordRepository.getById(request.notificationId);
        if (!updated) throw error;
        assertPersistedNotification(updated);
        if (updated.deliveryStatus === "delivered" || updated.deliveryStatus === "failed") {
          return { status: "already_terminal", notification: updated };
        }
        throw error;
      }
    }
  };
};
