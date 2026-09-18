import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryPatternNotificationRelationalRepositoryAdapter,
  type PatternNotificationRecord,
  type PatternNotificationRelationalReferenceReader,
  type ProductRecordMetadata,
  RelationalPatternNotificationRecordRepository,
  RepositoryError
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: "trace-notification-001",
  sourceObservedAtUtc: "2026-09-01T10:30:00.000Z"
};

const allReferencesResolve: PatternNotificationRelationalReferenceReader = {
  referenceExists: async () => true
};

const buildNotification = (
  overrides: Partial<PatternNotificationRecord> = {}
): PatternNotificationRecord => ({
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
  updatedAtUtc: "2026-09-01T10:30:00.000Z",
  ...overrides
});

const createRepository = (
  references: PatternNotificationRelationalReferenceReader = allReferencesResolve
) =>
  new RelationalPatternNotificationRecordRepository(
    new InMemoryPatternNotificationRelationalRepositoryAdapter(references)
  );

test("creates a notification and reads it back through the domain interface", async () => {
  const repository = createRepository();

  const created = await repository.create({ notification: buildNotification(), metadata });

  assert.equal(created.notificationId, "notification-btc-001");
  assert.equal(created.deliveryStatus, "pending_delivery");
  assert.equal(
    (await repository.getById("notification-btc-001"))?.policyId,
    "btc-breakout-conservative-v1"
  );
  assert.equal(
    (await repository.getByDeduplicationKey("signal_candidate:candidate-btc-001"))
      ?.notificationId,
    "notification-btc-001"
  );
  assert.equal(await repository.getById("missing"), null);
});

test("lists pending notifications through the domain interface", async () => {
  const repository = createRepository();
  await repository.create({ notification: buildNotification(), metadata });
  await repository.create({
    notification: buildNotification({
      notificationId: "notification-btc-002",
      deduplicationKey: "signal_candidate:candidate-btc-002",
      observedAt: "2026-09-01T09:00:00.000Z"
    }),
    metadata
  });

  const pending = await repository.listByDeliveryStatus(["pending_delivery"], 10);

  assert.deepEqual(
    pending.map((record) => record.notificationId),
    ["notification-btc-002", "notification-btc-001"]
  );
});

test("surfaces a missing evidence reference as a repository error", async () => {
  const repository = createRepository({
    referenceExists: async (_kind, entityId) => entityId !== "aggregate-btc-window-24h"
  });

  const error = await repository
    .create({ notification: buildNotification(), metadata })
    .then(() => null, (caught: unknown) => caught);

  assert.ok(error instanceof RepositoryError);
  assert.equal(error.code, "invalid_reference");
  assert.equal(error.referenceEntityType, "setup_aggregate_result");
});

test("an update increments the stored version", async () => {
  const repository = createRepository();
  await repository.create({ notification: buildNotification(), metadata });

  await repository.update({
    notification: buildNotification({
      deliveryStatus: "delivery_attempted",
      deliveryAttemptedAt: "2026-09-01T10:31:00.000Z",
      deliveryLeaseId: "lease-001",
      deliveryLeaseExpiresAt: "2026-09-01T10:33:00.000Z"
    }),
    metadata,
    expectedVersion: 1,
    expectedDeliveryStatus: "pending_delivery"
  });

  // A second claim from the same read must now fail, which proves the version moved.
  const error = await repository
    .update({
      notification: buildNotification({ deliveryStatus: "delivery_attempted" }),
      metadata,
      expectedVersion: 1
    })
    .then(() => null, (caught: unknown) => caught);

  assert.ok(error instanceof RepositoryError);
  assert.equal(error.code, "version_mismatch");
});

test("rejects an update that rewrites retained evidence", async () => {
  const repository = createRepository();
  await repository.create({ notification: buildNotification(), metadata });

  const error = await repository
    .update({
      notification: buildNotification({ currentPrice: 1 }),
      metadata,
      expectedVersion: 1
    })
    .then(() => null, (caught: unknown) => caught);

  assert.ok(error instanceof Error);
  assert.match(error.message, /evidence snapshot is immutable/);
});

test("rejects an update to a notification that was never retained", async () => {
  const repository = createRepository();

  const error = await repository
    .update({ notification: buildNotification(), metadata, expectedVersion: 1 })
    .then(() => null, (caught: unknown) => caught);

  assert.ok(error instanceof RepositoryError);
  assert.equal(error.code, "not_found");
});

test("records a terminal delivery outcome fenced to its own attempt", async () => {
  const repository = createRepository();
  await repository.create({ notification: buildNotification(), metadata });
  const claimed = buildNotification({
    deliveryStatus: "delivery_attempted",
    deliveryAttemptedAt: "2026-09-01T10:31:00.000Z",
    deliveryLeaseId: "lease-001",
    deliveryLeaseExpiresAt: "2026-09-01T10:33:00.000Z"
  });
  await repository.update({
    notification: claimed,
    metadata,
    expectedVersion: 1,
    expectedDeliveryStatus: "pending_delivery"
  });

  const delivered = await repository.update({
    notification: {
      ...claimed,
      deliveryStatus: "delivered",
      completedAt: "2026-09-01T10:31:05.000Z",
      outcomeCode: "telegram_delivered"
    },
    metadata,
    expectedVersion: 2,
    expectedDeliveryStatus: "delivery_attempted",
    expectedDeliveryAttemptedAt: "2026-09-01T10:31:00.000Z"
  });

  assert.equal(delivered.deliveryStatus, "delivered");
  assert.equal(delivered.outcomeCode, "telegram_delivered");
  assert.equal(delivered.deliveryLeaseId, "lease-001");
});
