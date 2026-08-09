import type {
  PatternNotificationDeliveryService,
  PatternNotificationRecord,
  ProductRecordMetadata
} from "@monitor/domain-model";

import type { PatternNotificationCandidate } from "./index.js";

export type RetainEligiblePatternNotificationRequest = {
  candidate: PatternNotificationCandidate;
  retainedAt: string;
  metadata: ProductRecordMetadata;
};

export type RetainEligiblePatternNotificationResult =
  | { status: "created"; notification: PatternNotificationRecord }
  | { status: "already_retained"; notification: PatternNotificationRecord }
  | { status: "rejected_validation"; reason: string }
  | { status: "failed"; reason: string };

export type PatternNotificationDeliveryPortRequest = {
  notification: PatternNotificationRecord;
};

export type PatternNotificationDeliveryPortOutcome = {
  status: "delivered" | "failed";
  completedAt: string;
  outcomeCode: string;
};

export type PatternNotificationDeliveryPort = {
  deliver(
    request: PatternNotificationDeliveryPortRequest
  ): Promise<PatternNotificationDeliveryPortOutcome>;
};

export type PatternNotificationRetentionRuntimeOptions = {
  patternNotificationDeliveryService: PatternNotificationDeliveryService;
};

export type PatternNotificationRetentionRuntime = {
  retain(
    request: RetainEligiblePatternNotificationRequest
  ): Promise<RetainEligiblePatternNotificationResult>;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const isEligibleCandidate = (value: unknown): value is PatternNotificationCandidate => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<PatternNotificationCandidate>;
  return (
    isNonEmptyString(candidate.notificationId) &&
    isNonEmptyString(candidate.deduplicationKey) &&
    isNonEmptyString(candidate.signalCandidateId) &&
    isNonEmptyString(candidate.setupDefinitionId) &&
    isNonEmptyString(candidate.setupRevisionId) &&
    isNonEmptyString(candidate.monitoredSymbolId) &&
    isNonEmptyString(candidate.setupAggregateResultId) &&
    candidate.direction === "consider_long" &&
    isValidTimestamp(candidate.observedAt) &&
    typeof candidate.currentPrice === "number" &&
    Number.isFinite(candidate.currentPrice) &&
    candidate.currentPrice > 0 &&
    isNonEmptyString(candidate.policyId) &&
    typeof candidate.completedEvaluations === "number" &&
    Number.isInteger(candidate.completedEvaluations) &&
    candidate.completedEvaluations > 0 &&
    typeof candidate.positiveOutcomeRate === "number" &&
    Number.isFinite(candidate.positiveOutcomeRate) &&
    candidate.positiveOutcomeRate >= 0 &&
    candidate.positiveOutcomeRate <= 1 &&
    typeof candidate.averagePercentageMove === "number" &&
    Number.isFinite(candidate.averagePercentageMove) &&
    isValidTimestamp(candidate.aggregateComputedAt)
  );
};

const buildRecord = (
  candidate: PatternNotificationCandidate,
  retainedAt: string
): PatternNotificationRecord => ({
  ...candidate,
  deliveryStatus: "pending_delivery",
  createdAtUtc: retainedAt,
  updatedAtUtc: retainedAt
});

const invalidResult = (): RetainEligiblePatternNotificationResult => ({
  status: "rejected_validation",
  reason: "eligible notification candidate and retainedAt are required"
});

export const createPatternNotificationRetentionRuntime = (
  options: PatternNotificationRetentionRuntimeOptions
): PatternNotificationRetentionRuntime => ({
  async retain(request) {
    if (
      !isEligibleCandidate(request.candidate) ||
      !isValidTimestamp(request.retainedAt) ||
      Date.parse(request.retainedAt) < Date.parse(request.candidate.observedAt)
    ) {
      return invalidResult();
    }

    try {
      const existing =
        await options.patternNotificationDeliveryService.getByDeduplicationKey(
          request.candidate.deduplicationKey
        );
      if (existing) {
        return { status: "already_retained", notification: existing };
      }
      const retained = await options.patternNotificationDeliveryService.retain({
        notification: buildRecord(request.candidate, request.retainedAt),
        metadata: request.metadata
      });
      return retained;
    } catch (error: unknown) {
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "unexpected notification retention failure"
      };
    }
  }
});
