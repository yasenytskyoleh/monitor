import type { PatternNotificationRecord } from "../notification/pattern-notification-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type PatternNotificationRecordCreateRequest = {
  notification: PatternNotificationRecord;
  metadata: ProductRecordMetadata;
};

export type PatternNotificationRecordUpdateRequest = {
  notification: PatternNotificationRecord;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
  expectedDeliveryStatus?: PatternNotificationRecord["deliveryStatus"];
  expectedDeliveryAttemptedAt?: string;
};

export type PatternNotificationRecordRepository = {
  getById(notificationId: string): Promise<PatternNotificationRecord | null>;
  getByDeduplicationKey(deduplicationKey: string): Promise<PatternNotificationRecord | null>;
  listByDeliveryStatus(
    statuses: PatternNotificationRecord["deliveryStatus"][],
    limit: number
  ): Promise<PatternNotificationRecord[]>;
  create(request: PatternNotificationRecordCreateRequest): Promise<PatternNotificationRecord>;
  update(request: PatternNotificationRecordUpdateRequest): Promise<PatternNotificationRecord>;
};

export class PatternNotificationRecordRepositoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatternNotificationRecordRepositoryValidationError";
  }
}

export const assertPatternNotificationEvidenceIsUnchanged = (
  current: PatternNotificationRecord,
  next: PatternNotificationRecord
): void => {
  const evidenceFields: (keyof PatternNotificationRecord)[] = [
    "notificationId",
    "deduplicationKey",
    "signalCandidateId",
    "setupDefinitionId",
    "setupRevisionId",
    "monitoredSymbolId",
    "setupAggregateResultId",
    "direction",
    "observedAt",
    "currentPrice",
    "policyId",
    "completedEvaluations",
    "positiveOutcomeRate",
    "averagePercentageMove",
    "aggregateComputedAt",
    "createdAtUtc"
  ];

  if (evidenceFields.some((field) => current[field] !== next[field])) {
    throw new PatternNotificationRecordRepositoryValidationError(
      "pattern_notification evidence snapshot is immutable"
    );
  }
};
