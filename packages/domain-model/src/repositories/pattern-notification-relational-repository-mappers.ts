import type { PatternNotificationRecord } from "../notification/pattern-notification-record.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type PatternNotificationDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const PATTERN_NOTIFICATION_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

const dedupeRelatedEntityIds = (values: Array<string | null | undefined>): string[] => {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value) {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
};

const buildRelatedEntityIds = (notification: PatternNotificationRecord): string[] =>
  dedupeRelatedEntityIds([
    notification.signalCandidateId,
    notification.setupDefinitionId,
    notification.setupRevisionId,
    notification.monitoredSymbolId,
    notification.setupAggregateResultId
  ]);

export const hydratePatternNotificationFromDurableRecord = (
  record: PatternNotificationDurableRecord
): PatternNotificationRecord => ({
  notificationId: record.identity.entityId,
  deduplicationKey: record.deduplicationKey,
  signalCandidateId: record.signalCandidateId,
  setupDefinitionId: record.setupDefinitionId,
  setupRevisionId: record.setupRevisionId,
  monitoredSymbolId: record.monitoredSymbolId,
  setupAggregateResultId: record.setupAggregateResultId,
  direction: record.direction,
  observedAt: record.observedAtUtc,
  currentPrice: record.currentPrice,
  policyId: record.policyId,
  completedEvaluations: record.completedEvaluations,
  positiveOutcomeRate: record.positiveOutcomeRate,
  averagePercentageMove: record.averagePercentageMove,
  aggregateComputedAt: record.aggregateComputedAtUtc,
  deliveryStatus: record.deliveryStatus,
  ...(record.deliveryAttemptedAtUtc
    ? { deliveryAttemptedAt: record.deliveryAttemptedAtUtc }
    : {}),
  ...(record.deliveryLeaseId ? { deliveryLeaseId: record.deliveryLeaseId } : {}),
  ...(record.deliveryLeaseExpiresAtUtc
    ? { deliveryLeaseExpiresAt: record.deliveryLeaseExpiresAtUtc }
    : {}),
  ...(record.completedAtUtc ? { completedAt: record.completedAtUtc } : {}),
  ...(record.outcomeCode ? { outcomeCode: record.outcomeCode } : {}),
  createdAtUtc: record.createdAtUtc,
  updatedAtUtc: record.updatedAtUtc
});

export const dehydratePatternNotificationToDurableRecord = (
  notification: PatternNotificationRecord,
  metadata: ProductRecordMetadata,
  version: number
): PatternNotificationDurableRecord => ({
  storageSchemaVersion: PATTERN_NOTIFICATION_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "pattern_notification",
    entityId: notification.notificationId,
    version,
    relatedEntityIds: buildRelatedEntityIds(notification)
  },
  lifecycleStatus: "active",
  createdAtUtc: notification.createdAtUtc,
  updatedAtUtc: notification.updatedAtUtc,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  deduplicationKey: notification.deduplicationKey,
  signalCandidateId: notification.signalCandidateId,
  setupDefinitionId: notification.setupDefinitionId,
  setupRevisionId: notification.setupRevisionId,
  monitoredSymbolId: notification.monitoredSymbolId,
  setupAggregateResultId: notification.setupAggregateResultId,
  direction: notification.direction,
  observedAtUtc: notification.observedAt,
  currentPrice: notification.currentPrice,
  policyId: notification.policyId,
  completedEvaluations: notification.completedEvaluations,
  positiveOutcomeRate: notification.positiveOutcomeRate,
  averagePercentageMove: notification.averagePercentageMove,
  aggregateComputedAtUtc: notification.aggregateComputedAt,
  deliveryStatus: notification.deliveryStatus,
  deliveryAttemptedAtUtc: notification.deliveryAttemptedAt ?? null,
  deliveryLeaseId: notification.deliveryLeaseId ?? null,
  deliveryLeaseExpiresAtUtc: notification.deliveryLeaseExpiresAt ?? null,
  completedAtUtc: notification.completedAt ?? null,
  outcomeCode: notification.outcomeCode ?? null
});
