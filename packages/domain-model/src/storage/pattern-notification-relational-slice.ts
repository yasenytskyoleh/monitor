import type { TimestampUtc } from "../common.js";
import type { PatternNotificationRecord } from "../notification/pattern-notification-record.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const PATTERN_NOTIFICATION_RELATIONAL_ENTITY_TYPES = ["pattern_notification"] as const;
export type PatternNotificationRelationalEntityType =
  (typeof PATTERN_NOTIFICATION_RELATIONAL_ENTITY_TYPES)[number];

/**
 * Evidence fields are captured once when the notification becomes eligible and never change.
 * Only the delivery columns below them may be updated, and only by the owning service.
 */
export type PatternNotificationDurableRecord =
  DurableRelationalRecordBase<"pattern_notification"> & {
    deduplicationKey: string;
    signalCandidateId: string;
    setupDefinitionId: string;
    setupRevisionId: string;
    monitoredSymbolId: string;
    setupAggregateResultId: string;
    direction: PatternNotificationRecord["direction"];
    observedAtUtc: TimestampUtc;
    currentPrice: number;
    policyId: string;
    completedEvaluations: number;
    positiveOutcomeRate: number;
    averagePercentageMove: number;
    aggregateComputedAtUtc: TimestampUtc;
    deliveryStatus: PatternNotificationRecord["deliveryStatus"];
    deliveryAttemptedAtUtc: TimestampUtc | null;
    deliveryLeaseId: string | null;
    deliveryLeaseExpiresAtUtc: TimestampUtc | null;
    completedAtUtc: TimestampUtc | null;
    outcomeCode: string | null;
  };

export const PATTERN_NOTIFICATION_DURABLE_EVIDENCE_FIELDS = [
  "deduplicationKey",
  "signalCandidateId",
  "setupDefinitionId",
  "setupRevisionId",
  "monitoredSymbolId",
  "setupAggregateResultId",
  "direction",
  "observedAtUtc",
  "currentPrice",
  "policyId",
  "completedEvaluations",
  "positiveOutcomeRate",
  "averagePercentageMove",
  "aggregateComputedAtUtc"
] as const satisfies readonly (keyof PatternNotificationDurableRecord)[];

export const PATTERN_NOTIFICATION_DURABLE_DELIVERY_FIELDS = [
  "deliveryStatus",
  "deliveryAttemptedAtUtc",
  "deliveryLeaseId",
  "deliveryLeaseExpiresAtUtc",
  "completedAtUtc",
  "outcomeCode"
] as const satisfies readonly (keyof PatternNotificationDurableRecord)[];
