import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryPatternNotificationRelationalRepositoryAdapter,
  PATTERN_NOTIFICATION_REFERENCE_KINDS,
  PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_ERROR_MAPPING,
  PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_OPERATIONS,
  type PatternNotificationReferenceKind,
  type PatternNotificationDurableRecord,
  type PatternNotificationRelationalReferenceReader,
  type ProductRecordMetadata,
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

const SIGNAL_CANDIDATE_ID = "candidate-btc-001";
const SETUP_DEFINITION_ID = "setup-btc-breakout";
const SETUP_REVISION_ID = "revision-btc-breakout-1";
const MONITORED_SYMBOL_ID = "BTC-USDT";
const SETUP_AGGREGATE_RESULT_ID = "aggregate-btc-window-24h";

const buildNotification = (
  overrides: Partial<PatternNotificationDurableRecord> = {}
): PatternNotificationDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "pattern_notification",
    entityId: "notification-btc-001",
    version: 1,
    relatedEntityIds: [
      SIGNAL_CANDIDATE_ID,
      SETUP_DEFINITION_ID,
      SETUP_REVISION_ID,
      MONITORED_SYMBOL_ID,
      SETUP_AGGREGATE_RESULT_ID
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-09-01T10:30:00.000Z",
  updatedAtUtc: "2026-09-01T10:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  deduplicationKey: `signal_candidate:${SIGNAL_CANDIDATE_ID}`,
  signalCandidateId: SIGNAL_CANDIDATE_ID,
  setupDefinitionId: SETUP_DEFINITION_ID,
  setupRevisionId: SETUP_REVISION_ID,
  monitoredSymbolId: MONITORED_SYMBOL_ID,
  setupAggregateResultId: SETUP_AGGREGATE_RESULT_ID,
  direction: "consider_long",
  observedAtUtc: "2026-09-01T10:30:00.000Z",
  currentPrice: 64250.5,
  policyId: "btc-breakout-conservative-v1",
  completedEvaluations: 42,
  positiveOutcomeRate: 0.67,
  averagePercentageMove: 0.82,
  aggregateComputedAtUtc: "2026-09-01T06:00:00.000Z",
  deliveryStatus: "pending_delivery",
  deliveryAttemptedAtUtc: null,
  deliveryLeaseId: null,
  deliveryLeaseExpiresAtUtc: null,
  completedAtUtc: null,
  outcomeCode: null,
  ...overrides
});

/** Every reference resolves unless its id is listed in `missing`. */
const createReferenceReader = (
  missing: string[] = []
): PatternNotificationRelationalReferenceReader => ({
  referenceExists: async (_kind, entityId) => !missing.includes(entityId)
});

const createAdapter = (missing: string[] = []) =>
  new InMemoryPatternNotificationRelationalRepositoryAdapter(createReferenceReader(missing));

const expectRepositoryError = async (
  run: () => Promise<unknown>,
  expectedCode: string
): Promise<RepositoryError> => {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught
  );

  assert.ok(error instanceof RepositoryError, "expected a RepositoryError");
  assert.equal(error.code, expectedCode);
  assert.equal(error.entityType, "pattern_notification");
  return error;
};

test("exposes the pattern-notification relational adapter contract", () => {
  assert.deepEqual(PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_OPERATIONS, [
    "load_pattern_notification",
    "load_pattern_notification_by_deduplication_key",
    "list_pattern_notifications_by_delivery_status",
    "insert_pattern_notification",
    "update_pattern_notification"
  ]);
  assert.deepEqual(PATTERN_NOTIFICATION_RELATIONAL_ADAPTER_ERROR_MAPPING.retryable, [
    "transient_failure",
    "unknown_failure"
  ]);
});

test("inserts a notification and reads it back by id and deduplication key", async () => {
  const adapter = createAdapter();
  const record = buildNotification();

  await adapter.insertPatternNotification({ record });

  const byId = await adapter.loadPatternNotification("notification-btc-001");
  const byKey = await adapter.loadPatternNotificationByDeduplicationKey(
    `signal_candidate:${SIGNAL_CANDIDATE_ID}`
  );

  assert.equal(byId?.deduplicationKey, `signal_candidate:${SIGNAL_CANDIDATE_ID}`);
  assert.equal(byKey?.identity.entityId, "notification-btc-001");
  assert.equal(await adapter.loadPatternNotification("missing"), null);
});

test("stored notifications are isolated from later caller mutation", async () => {
  const adapter = createAdapter();
  const record = buildNotification();

  await adapter.insertPatternNotification({ record });
  record.currentPrice = 1;

  const stored = await adapter.loadPatternNotification("notification-btc-001");
  assert.equal(stored?.currentPrice, 64250.5);
});

test("rejects a duplicate notification id deterministically", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });

  await expectRepositoryError(
    () => adapter.insertPatternNotification({ record: buildNotification() }),
    "already_exists"
  );
});

test("rejects a second notification for the same signal candidate", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });

  const duplicateKey = buildNotification({
    identity: { ...buildNotification().identity, entityId: "notification-btc-002" }
  });

  const error = await expectRepositoryError(
    () => adapter.insertPatternNotification({ record: duplicateKey }),
    "already_exists"
  );
  assert.equal(error.entityId, `signal_candidate:${SIGNAL_CANDIDATE_ID}`);
});

test("rejects every missing evidence reference deterministically", async () => {
  const references: [string, PatternNotificationReferenceKind][] = [
    [SIGNAL_CANDIDATE_ID, "signal_candidate"],
    [SETUP_DEFINITION_ID, "setup_definition"],
    [SETUP_REVISION_ID, "setup_definition_revision"],
    [MONITORED_SYMBOL_ID, "monitored_symbol"],
    [SETUP_AGGREGATE_RESULT_ID, "setup_aggregate_result"]
  ];

  assert.deepEqual(
    references.map(([, kind]) => kind),
    [...PATTERN_NOTIFICATION_REFERENCE_KINDS],
    "every declared reference kind must be covered"
  );

  for (const [missingId, referenceEntityType] of references) {
    const adapter = createAdapter([missingId]);
    const error = await expectRepositoryError(
      () => adapter.insertPatternNotification({ record: buildNotification() }),
      "invalid_reference"
    );

    assert.equal(error.referenceEntityType, referenceEntityType);
    assert.equal(error.referenceEntityId, missingId);
  }
});

test("lists pending notifications in observation order and honours the limit", async () => {
  const adapter = createAdapter();

  for (const [index, observedAtUtc] of [
    "2026-09-01T12:00:00.000Z",
    "2026-09-01T10:00:00.000Z",
    "2026-09-01T11:00:00.000Z"
  ].entries()) {
    await adapter.insertPatternNotification({
      record: buildNotification({
        identity: {
          ...buildNotification().identity,
          entityId: `notification-btc-00${index + 1}`
        },
        deduplicationKey: `signal_candidate:candidate-btc-00${index + 1}`,
        observedAtUtc
      })
    });
  }

  const pending = await adapter.listPatternNotificationsByDeliveryStatus({
    statuses: ["pending_delivery"],
    limit: 2
  });

  assert.deepEqual(
    pending.map((record) => record.observedAtUtc),
    ["2026-09-01T10:00:00.000Z", "2026-09-01T11:00:00.000Z"]
  );

  const delivered = await adapter.listPatternNotificationsByDeliveryStatus({
    statuses: ["delivered"],
    limit: 10
  });
  assert.deepEqual(delivered, []);
});

test("rejects an update to an unknown notification", async () => {
  const adapter = createAdapter();

  await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({
        record: buildNotification(),
        expectedVersion: 1
      }),
    "not_found"
  );
});

test("rejects a stale expected version", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });

  const error = await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({
        record: buildNotification({ deliveryStatus: "delivery_attempted" }),
        expectedVersion: 7
      }),
    "version_mismatch"
  );

  assert.equal(error.expectedVersion, 7);
  assert.equal(error.actualVersion, 1);
});

test("a losing claimer is rejected rather than overwriting the winner", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });

  const claimed = buildNotification({
    identity: { ...buildNotification().identity, version: 2 },
    deliveryStatus: "delivery_attempted",
    deliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z",
    deliveryLeaseId: "lease-001",
    deliveryLeaseExpiresAtUtc: "2026-09-01T10:33:00.000Z"
  });
  await adapter.updatePatternNotification({
    record: claimed,
    expectedVersion: 1,
    expectedDeliveryStatus: "pending_delivery"
  });

  // A second caller that still believes the record is pending must lose.
  await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({
        record: buildNotification({
          deliveryStatus: "delivery_attempted",
          deliveryAttemptedAtUtc: "2026-09-01T10:32:00.000Z",
          deliveryLeaseId: "lease-002"
        }),
        expectedVersion: null,
        expectedDeliveryStatus: "pending_delivery"
      }),
    "version_mismatch"
  );

  const stored = await adapter.loadPatternNotification("notification-btc-001");
  assert.equal(stored?.deliveryLeaseId, "lease-001");
});

test("rejects a terminal write whose lease attempt time does not match", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });
  await adapter.updatePatternNotification({
    record: buildNotification({
      identity: { ...buildNotification().identity, version: 2 },
      deliveryStatus: "delivery_attempted",
      deliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z",
      deliveryLeaseId: "lease-001",
      deliveryLeaseExpiresAtUtc: "2026-09-01T10:33:00.000Z"
    }),
    expectedVersion: 1,
    expectedDeliveryStatus: "pending_delivery"
  });

  await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({
        record: buildNotification({ deliveryStatus: "delivered" }),
        expectedVersion: 2,
        expectedDeliveryStatus: "delivery_attempted",
        expectedDeliveryAttemptedAtUtc: "2026-09-01T09:00:00.000Z"
      }),
    "version_mismatch"
  );
});

test("applies a guarded terminal delivery outcome", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });
  await adapter.updatePatternNotification({
    record: buildNotification({
      identity: { ...buildNotification().identity, version: 2 },
      deliveryStatus: "delivery_attempted",
      deliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z",
      deliveryLeaseId: "lease-001",
      deliveryLeaseExpiresAtUtc: "2026-09-01T10:33:00.000Z"
    }),
    expectedVersion: 1,
    expectedDeliveryStatus: "pending_delivery"
  });

  const delivered = await adapter.updatePatternNotification({
    record: buildNotification({
      identity: { ...buildNotification().identity, version: 3 },
      deliveryStatus: "delivered",
      deliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z",
      completedAtUtc: "2026-09-01T10:31:05.000Z",
      outcomeCode: "telegram_delivered"
    }),
    expectedVersion: 2,
    expectedDeliveryStatus: "delivery_attempted",
    expectedDeliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z"
  });

  assert.equal(delivered.deliveryStatus, "delivered");
  assert.equal(delivered.outcomeCode, "telegram_delivered");
});

test("a terminal outcome may not keep its delivery lease", async () => {
  const adapter = createAdapter();
  await adapter.insertPatternNotification({ record: buildNotification() });
  await adapter.updatePatternNotification({
    record: buildNotification({
      identity: { ...buildNotification().identity, version: 2 },
      deliveryStatus: "delivery_attempted",
      deliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z",
      deliveryLeaseId: "lease-001",
      deliveryLeaseExpiresAtUtc: "2026-09-01T10:33:00.000Z"
    }),
    expectedVersion: 1,
    expectedDeliveryStatus: "pending_delivery"
  });

  // Postgres rejects this via pattern_notification_delivery_lease_consistent; so must we.
  await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({
        record: buildNotification({
          identity: { ...buildNotification().identity, version: 3 },
          deliveryStatus: "delivered",
          deliveryAttemptedAtUtc: "2026-09-01T10:31:00.000Z",
          deliveryLeaseId: "lease-001",
          deliveryLeaseExpiresAtUtc: "2026-09-01T10:33:00.000Z",
          completedAtUtc: "2026-09-01T10:31:05.000Z",
          outcomeCode: "telegram_delivered"
        }),
        expectedVersion: 2,
        expectedDeliveryStatus: "delivery_attempted"
      }),
    "version_mismatch"
  );
});
