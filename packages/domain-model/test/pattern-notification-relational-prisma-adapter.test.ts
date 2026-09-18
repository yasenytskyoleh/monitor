import assert from "node:assert/strict";
import test from "node:test";

import {
  type PatternNotificationDurableRecord,
  type PatternNotificationRelationalPrismaClient,
  PrismaPatternNotificationRelationalRepositoryAdapter,
  RepositoryError
} from "../src/index.js";

const buildRow = (overrides: Record<string, unknown> = {}) => ({
  notificationId: "notification-btc-001",
  version: 1,
  lifecycleStatus: "active",
  deliveryStatus: "pending_delivery",
  deduplicationKey: "signal_candidate:candidate-btc-001",
  signalCandidateId: "candidate-btc-001",
  setupDefinitionId: "setup-btc-breakout",
  setupRevisionId: "revision-btc-breakout-1",
  monitoredSymbolId: "BTC-USDT",
  setupAggregateResultId: "aggregate-btc-window-24h",
  direction: "consider_long",
  observedAtUtc: new Date("2026-09-01T10:30:00.000Z"),
  currentPrice: 64250.5,
  policyId: "btc-breakout-conservative-v1",
  completedEvaluations: 42,
  positiveOutcomeRate: 0.67,
  averagePercentageMove: 0.82,
  aggregateComputedAtUtc: new Date("2026-09-01T06:00:00.000Z"),
  deliveryAttemptedAtUtc: null,
  deliveryLeaseId: null,
  deliveryLeaseExpiresAtUtc: null,
  completedAtUtc: null,
  outcomeCode: null,
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: "trace-notification-001",
  sourceObservedAtUtc: new Date("2026-09-01T10:30:00.000Z"),
  metadataNotes: null,
  createdAtUtc: new Date("2026-09-01T10:30:00.000Z"),
  updatedAtUtc: new Date("2026-09-01T10:30:00.000Z"),
  archivedAtUtc: null,
  ...overrides
});

type ClientOptions = {
  row?: ReturnType<typeof buildRow> | null;
  createError?: unknown;
  updateCount?: number;
  missingReference?: string;
};

const existenceDelegate = (missingReference?: string) => ({
  findUnique: async (args: { where: Record<string, string> }) => {
    const [value] = Object.values(args.where);
    return value === missingReference ? null : { present: true };
  }
});

const createClient = (options: ClientOptions = {}) => {
  const calls: string[] = [];
  const client: PatternNotificationRelationalPrismaClient = {
    patternNotificationRecord: {
      create: async () => {
        calls.push("create");
        if (options.createError) {
          throw options.createError;
        }
        return buildRow() as never;
      },
      findUnique: async () => (options.row === undefined ? buildRow() : options.row) as never,
      findMany: async () => [buildRow()] as never,
      updateMany: async () => {
        calls.push("updateMany");
        return { count: options.updateCount ?? 1 };
      }
    },
    signalCandidateRecord: existenceDelegate(options.missingReference),
    setupDefinitionRecord: existenceDelegate(options.missingReference),
    setupDefinitionRevisionRecord: existenceDelegate(options.missingReference),
    monitoredSymbolRecord: existenceDelegate(options.missingReference),
    setupAggregateResultRecord: existenceDelegate(options.missingReference)
  };

  return { client, calls };
};

const durableRecord: PatternNotificationDurableRecord = {
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "pattern_notification",
    entityId: "notification-btc-001",
    version: 1,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-09-01T10:30:00.000Z",
  updatedAtUtc: "2026-09-01T10:30:00.000Z",
  archivedAtUtc: null,
  metadata: {
    originRunId: null,
    originTransitionId: null,
    createdBySource: "notification_pipeline",
    lastUpdatedBySource: "notification_pipeline",
    traceId: "trace-notification-001",
    sourceObservedAtUtc: "2026-09-01T10:30:00.000Z"
  },
  deduplicationKey: "signal_candidate:candidate-btc-001",
  signalCandidateId: "candidate-btc-001",
  setupDefinitionId: "setup-btc-breakout",
  setupRevisionId: "revision-btc-breakout-1",
  monitoredSymbolId: "BTC-USDT",
  setupAggregateResultId: "aggregate-btc-window-24h",
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
  outcomeCode: null
};

const expectRepositoryError = async (
  run: () => Promise<unknown>,
  expectedCode: string
): Promise<RepositoryError> => {
  const error = await run().then(() => null, (caught: unknown) => caught);
  assert.ok(error instanceof RepositoryError, "expected a RepositoryError");
  assert.equal(error.code, expectedCode);
  return error;
};

test("hydrates a stored row into a durable record", async () => {
  const { client } = createClient();
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  const record = await adapter.loadPatternNotification("notification-btc-001");

  assert.equal(record?.identity.entityType, "pattern_notification");
  assert.equal(record?.observedAtUtc, "2026-09-01T10:30:00.000Z");
  assert.equal(record?.deliveryAttemptedAtUtc, null);
  assert.deepEqual(record?.identity.relatedEntityIds, [
    "candidate-btc-001",
    "setup-btc-breakout",
    "revision-btc-breakout-1",
    "BTC-USDT",
    "aggregate-btc-window-24h"
  ]);
});

test("returns null when no row matches", async () => {
  const { client } = createClient({ row: null });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  assert.equal(await adapter.loadPatternNotification("missing"), null);
});

test("rejects a dangling reference before writing, since the table has no foreign keys", async () => {
  const { client, calls } = createClient({ missingReference: "aggregate-btc-window-24h" });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  const error = await expectRepositoryError(
    () => adapter.insertPatternNotification({ record: durableRecord }),
    "invalid_reference"
  );

  assert.equal(error.referenceEntityType, "setup_aggregate_result");
  assert.deepEqual(calls, [], "no row may be written once a reference fails");
});

test("maps a unique conflict to already_exists", async () => {
  const { client } = createClient({ createError: { code: "P2002" } });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  const error = await expectRepositoryError(
    () => adapter.insertPatternNotification({ record: durableRecord }),
    "already_exists"
  );
  assert.equal(error.retryDisposition, "do_not_retry");
});

test("maps a connection failure to a retryable transient failure", async () => {
  const { client } = createClient({ createError: { code: "P1001" } });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  const error = await expectRepositoryError(
    () => adapter.insertPatternNotification({ record: durableRecord }),
    "transient_failure"
  );
  assert.equal(error.retryDisposition, "retryable");
});

test("maps an unrecognized failure to unknown_failure", async () => {
  const { client } = createClient({ createError: new Error("boom") });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  await expectRepositoryError(
    () => adapter.insertPatternNotification({ record: durableRecord }),
    "unknown_failure"
  );
});

test("a guarded update that matches no row is a version mismatch", async () => {
  const { client } = createClient({ updateCount: 0 });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  const error = await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({
        record: durableRecord,
        expectedVersion: 1,
        expectedDeliveryStatus: "pending_delivery"
      }),
    "version_mismatch"
  );

  assert.equal(error.expectedVersion, 1);
});

test("updating a row that no longer exists is not_found", async () => {
  const { client } = createClient({ row: null });
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  await expectRepositoryError(
    () =>
      adapter.updatePatternNotification({ record: durableRecord, expectedVersion: 1 }),
    "not_found"
  );
});

test("lists by delivery status through the adapter", async () => {
  const { client } = createClient();
  const adapter = new PrismaPatternNotificationRelationalRepositoryAdapter(client);

  const records = await adapter.listPatternNotificationsByDeliveryStatus({
    statuses: ["pending_delivery"],
    limit: 5
  });

  assert.equal(records.length, 1);
  assert.equal(records[0]?.deduplicationKey, "signal_candidate:candidate-btc-001");
});
