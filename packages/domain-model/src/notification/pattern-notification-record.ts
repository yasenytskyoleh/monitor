import type { DomainEntityBase, TimestampUtc } from "../common.js";

export const PATTERN_NOTIFICATION_DELIVERY_STATUSES = [
  "pending_delivery",
  "delivery_attempted",
  "delivered",
  "failed"
] as const;

export type PatternNotificationDeliveryStatus =
  (typeof PATTERN_NOTIFICATION_DELIVERY_STATUSES)[number];

const PATTERN_NOTIFICATION_OUTCOME_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

export const isPatternNotificationOutcomeCode = (value: string): boolean =>
  PATTERN_NOTIFICATION_OUTCOME_CODE_PATTERN.test(value);

export type PatternNotificationRecord = DomainEntityBase & {
  notificationId: string;
  deduplicationKey: string;
  signalCandidateId: string;
  setupDefinitionId: string;
  setupRevisionId: string;
  monitoredSymbolId: string;
  setupAggregateResultId: string;
  direction: "consider_long";
  observedAt: TimestampUtc;
  currentPrice: number;
  policyId: string;
  completedEvaluations: number;
  positiveOutcomeRate: number;
  averagePercentageMove: number;
  aggregateComputedAt: TimestampUtc;
  deliveryStatus: PatternNotificationDeliveryStatus;
  deliveryAttemptedAt?: TimestampUtc;
  completedAt?: TimestampUtc;
  outcomeCode?: string;
};
