import type {
  PatternNotificationDeliveryService,
  PatternNotificationRecord,
  ProductRecordMetadata
} from "@monitor/domain-model";

import type { PatternNotificationDeliveryPort, PatternNotificationDeliveryPortOutcome } from "./retention.js";

export type DeliverRetainedPatternNotificationRequest = {
  notificationId: string;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type DeliverRetainedPatternNotificationResult =
  | {
      status: "outcome_recorded";
      notification: PatternNotificationRecord;
      outcome: PatternNotificationDeliveryPortOutcome;
    }
  | { status: "not_found" }
  | { status: "not_claimed" }
  | { status: "rejected_validation" }
  | { status: "outcome_unconfirmed" };

export type PatternNotificationDeliveryWorkflowOptions = {
  patternNotificationDeliveryService: PatternNotificationDeliveryService;
  deliveryPort: PatternNotificationDeliveryPort;
  deliveryLeaseDurationMs: number;
  deliveryLeaseOutcomeGraceMs: number;
  deliveryLeaseIdFactory?: () => string;
  now?: () => string;
};

export type PatternNotificationDeliveryWorkflow = {
  deliver(
    request: DeliverRetainedPatternNotificationRequest
  ): Promise<DeliverRetainedPatternNotificationResult>;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const isExpectedVersion = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isInteger(value) && value > 0);

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const isDeliveryPortOutcome = (value: unknown): value is PatternNotificationDeliveryPortOutcome => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const outcome = value as Partial<PatternNotificationDeliveryPortOutcome>;
  return (
    (outcome.status === "delivered" || outcome.status === "failed") &&
    isValidTimestamp(outcome.completedAt) &&
    isNonEmptyString(outcome.outcomeCode)
  );
};

const isValidRequest = (request: DeliverRetainedPatternNotificationRequest): boolean =>
  isNonEmptyString(request.notificationId) &&
  isExpectedVersion(request.expectedVersion);

export const createPatternNotificationDeliveryWorkflow = (
  options: PatternNotificationDeliveryWorkflowOptions
): PatternNotificationDeliveryWorkflow => {
  if (
    !isPositiveInteger(options.deliveryPort.maxExecutionMs) ||
    !isPositiveInteger(options.deliveryLeaseDurationMs) ||
    !isPositiveInteger(options.deliveryLeaseOutcomeGraceMs) ||
    options.deliveryPort.maxExecutionMs >
      Number.MAX_SAFE_INTEGER - options.deliveryLeaseOutcomeGraceMs ||
    options.deliveryLeaseDurationMs <
      options.deliveryPort.maxExecutionMs + options.deliveryLeaseOutcomeGraceMs
  ) {
    throw new Error("Delivery lease duration must cover execution and outcome recording grace");
  }
  const leaseIdFactory = options.deliveryLeaseIdFactory ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date().toISOString());

  return {
    async deliver(request) {
      if (!isValidRequest(request)) return { status: "rejected_validation" };
      const attemptedAt = now();
      if (!isValidTimestamp(attemptedAt)) return { status: "rejected_validation" };
      const deliveryLeaseId = leaseIdFactory();
      if (!isNonEmptyString(deliveryLeaseId)) return { status: "rejected_validation" };
      const expiresAt = new Date(
        Date.parse(attemptedAt) + options.deliveryLeaseDurationMs
      );
      if (Number.isNaN(expiresAt.valueOf())) return { status: "rejected_validation" };
      const deliveryLeaseExpiresAt = expiresAt.toISOString();

      let notification: PatternNotificationRecord | null;
      try {
        notification = await options.patternNotificationDeliveryService.claimDeliveryAttempt({
          notificationId: request.notificationId,
          attemptedAt,
          deliveryLeaseId,
          deliveryLeaseExpiresAt,
          metadata: request.metadata,
          expectedVersion: request.expectedVersion
        });
      } catch {
        return { status: "not_claimed" };
      }
      if (!notification) return { status: "not_found" };

      let outcome: PatternNotificationDeliveryPortOutcome;
      try {
        outcome = await options.deliveryPort.deliver({ notification });
      } catch {
        return { status: "outcome_unconfirmed" };
      }
      if (!isDeliveryPortOutcome(outcome)) return { status: "outcome_unconfirmed" };

      try {
        const recorded = await options.patternNotificationDeliveryService.recordDeliveryOutcome({
          notificationId: notification.notificationId,
          status: outcome.status,
          completedAt: outcome.completedAt,
          outcomeCode: outcome.outcomeCode,
          deliveryLeaseId,
          metadata: request.metadata,
          expectedVersion: null
        });
        return recorded
          ? { status: "outcome_recorded", notification: recorded, outcome }
          : { status: "outcome_unconfirmed" };
      } catch {
        return { status: "outcome_unconfirmed" };
      }
    }
  };
};
