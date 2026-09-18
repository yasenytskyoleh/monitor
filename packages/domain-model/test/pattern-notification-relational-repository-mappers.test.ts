import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydratePatternNotificationToDurableRecord,
  hydratePatternNotificationFromDurableRecord,
  type PatternNotificationRecord,
  type ProductRecordMetadata
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: "trace-notification-001",
  sourceObservedAtUtc: "2026-09-01T10:30:00.000Z"
};

const pendingNotification: PatternNotificationRecord = {
  notificationId: "notification-btc-001",
  deduplicationKey: "signal_candidate:candidate-btc-001",
  signalCandidateId: "candidate-btc-001",
  setupDefinitionId: "setup-btc-breakout",
  setupRevisionId: "revision-btc-breakout-1",
  monitoredSymbolId: "BTC-USDT",
  setupAggregateResultId: "aggregate-btc-window-24h",
  direction: "consider_long",
  observedAt: "2026-09-01T10:30:00.000Z",
  currentPrice: 64250.5,
  policyId: "btc-breakout-conservative-v1",
  completedEvaluations: 42,
  positiveOutcomeRate: 0.67,
  averagePercentageMove: 0.82,
  aggregateComputedAt: "2026-09-01T06:00:00.000Z",
  deliveryStatus: "pending_delivery",
  createdAtUtc: "2026-09-01T10:30:00.000Z",
  updatedAtUtc: "2026-09-01T10:30:00.000Z"
};

test("dehydrates a pending notification into a durable record", () => {
  const record = dehydratePatternNotificationToDurableRecord(pendingNotification, metadata, 1);

  assert.equal(record.identity.entityId, "notification-btc-001");
  assert.equal(record.identity.entityType, "pattern_notification");
  assert.equal(record.identity.version, 1);
  assert.equal(record.storageSchemaVersion, "product_domain.relational.v1");
  assert.equal(record.observedAtUtc, "2026-09-01T10:30:00.000Z");
  assert.equal(record.aggregateComputedAtUtc, "2026-09-01T06:00:00.000Z");
});

test("optional delivery fields become explicit nulls in the durable record", () => {
  const record = dehydratePatternNotificationToDurableRecord(pendingNotification, metadata, 1);

  assert.equal(record.deliveryAttemptedAtUtc, null);
  assert.equal(record.deliveryLeaseId, null);
  assert.equal(record.deliveryLeaseExpiresAtUtc, null);
  assert.equal(record.completedAtUtc, null);
  assert.equal(record.outcomeCode, null);
});

test("relatedEntityIds snapshots the evidence this notification was derived from", () => {
  const record = dehydratePatternNotificationToDurableRecord(pendingNotification, metadata, 1);

  assert.deepEqual(record.identity.relatedEntityIds, [
    "candidate-btc-001",
    "setup-btc-breakout",
    "revision-btc-breakout-1",
    "BTC-USDT",
    "aggregate-btc-window-24h"
  ]);
});

test("round-trips a pending notification unchanged", () => {
  const roundTripped = hydratePatternNotificationFromDurableRecord(
    dehydratePatternNotificationToDurableRecord(pendingNotification, metadata, 1)
  );

  assert.deepEqual(roundTripped, pendingNotification);
});

test("round-trips a delivered notification with its lease and outcome", () => {
  const delivered: PatternNotificationRecord = {
    ...pendingNotification,
    deliveryStatus: "delivered",
    deliveryAttemptedAt: "2026-09-01T10:31:00.000Z",
    deliveryLeaseId: "lease-001",
    deliveryLeaseExpiresAt: "2026-09-01T10:33:00.000Z",
    completedAt: "2026-09-01T10:31:05.000Z",
    outcomeCode: "telegram_delivered",
    updatedAtUtc: "2026-09-01T10:31:05.000Z"
  };

  const roundTripped = hydratePatternNotificationFromDurableRecord(
    dehydratePatternNotificationToDurableRecord(delivered, metadata, 3)
  );

  assert.deepEqual(roundTripped, delivered);
});

test("metadata is copied rather than shared with the caller", () => {
  const mutableMetadata: ProductRecordMetadata = { ...metadata };
  const record = dehydratePatternNotificationToDurableRecord(
    pendingNotification,
    mutableMetadata,
    1
  );

  mutableMetadata.traceId = "mutated";

  assert.equal(record.metadata.traceId, "trace-notification-001");
});
