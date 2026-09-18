import assert from "node:assert/strict";
import test from "node:test";

import type {
  PatternNotificationDeliveryService,
  PatternNotificationRecord,
  ProductRecordMetadata
} from "@monitor/domain-model";

import { createPatternNotificationDeliveryReconciliationRunner } from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: "trace-notification-001",
  sourceObservedAtUtc: "2026-09-01T10:30:00.000Z"
};

const attemptedNotification = (notificationId: string): PatternNotificationRecord => ({
  notificationId,
  deduplicationKey: `signal_candidate:${notificationId}`,
  signalCandidateId: notificationId,
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
  deliveryStatus: "delivery_attempted",
  createdAtUtc: "2026-09-01T10:30:00.000Z",
  updatedAtUtc: "2026-09-01T10:30:00.000Z"
});

const policy = {
  minRunIntervalMs: 60_000,
  maxReconciliationsPerRun: 5,
  minAttemptAgeMs: 120_000,
  leaseClockSkewToleranceMs: 5_000
};

const retainedNotification = attemptedNotification("notification-stub");

type ServiceOverrides = Partial<
  Pick<
    PatternNotificationDeliveryService,
    "listByDeliveryStatus" | "reconcileUnconfirmedDelivery" | "claimDeliveryAttempt"
  >
>;

const createService = (overrides: ServiceOverrides = {}): PatternNotificationDeliveryService => ({
  getById: async () => null,
  getByDeduplicationKey: async () => null,
  listByDeliveryStatus: async () => [],
  retain: async () => ({ status: "already_retained", notification: retainedNotification }),
  claimDeliveryAttempt: async () => null,
  recordDeliveryOutcome: async () => null,
  reconcileUnconfirmedDelivery: async () => ({ status: "not_found" }),
  ...overrides
});

test("rejects an invalid reconciliation policy", () => {
  assert.throws(
    () =>
      createPatternNotificationDeliveryReconciliationRunner({
        patternNotificationDeliveryService: createService(),
        policy: { ...policy, minAttemptAgeMs: 0 }
      }),
    /policy is invalid/
  );
});

test("reconciles only attempted deliveries and never re-sends one", async () => {
  const listed: unknown[] = [];
  const claims: unknown[] = [];
  const service = createService({
    listByDeliveryStatus: async (statuses, limit) => {
      listed.push({ statuses, limit });
      return [attemptedNotification("notification-001")];
    },
    reconcileUnconfirmedDelivery: async () => ({ status: "reconciled", notification: retainedNotification }),
    claimDeliveryAttempt: async (claim) => {
      claims.push(claim);
      return null;
    }
  });

  const result = await createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: service,
    policy,
    now: () => "2026-09-01T12:00:00.000Z"
  }).reconcile({ metadata });

  assert.equal(result.status, "completed");
  assert.deepEqual(listed, [{ statuses: ["delivery_attempted"], limit: 5 }]);
  assert.deepEqual(claims, [], "reconciliation must never claim or re-send an alert");
  assert.deepEqual(
    result.status === "completed" ? result.reconciliations : [],
    [{ notificationId: "notification-001", status: "reconciled" }]
  );
});

test("passes the configured staleness and clock-skew tolerances through", async () => {
  const requests: {
    minAttemptAgeMs: number | undefined;
    leaseClockSkewToleranceMs: number | undefined;
  }[] = [];
  const service = createService({
    listByDeliveryStatus: async () => [attemptedNotification("notification-001")],
    reconcileUnconfirmedDelivery: async (request) => {
      requests.push({
        minAttemptAgeMs: request.minAttemptAgeMs,
        leaseClockSkewToleranceMs: request.leaseClockSkewToleranceMs
      });
      return { status: "lease_active", notification: retainedNotification };
    }
  });

  await createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: service,
    policy,
    now: () => "2026-09-01T12:00:00.000Z"
  }).reconcile({ metadata });

  assert.deepEqual(requests, [
    { minAttemptAgeMs: 120_000, leaseClockSkewToleranceMs: 5_000 }
  ]);
});

test("one failing item does not abort the rest of the run", async () => {
  const service = createService({
    listByDeliveryStatus: async () => [
      attemptedNotification("notification-001"),
      attemptedNotification("notification-002")
    ],
    reconcileUnconfirmedDelivery: async (request) => {
      if (request.notificationId === "notification-001") {
        throw new Error("row vanished");
      }
      return { status: "reconciled", notification: retainedNotification };
    }
  });

  const result = await createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: service,
    policy,
    now: () => "2026-09-01T12:00:00.000Z"
  }).reconcile({ metadata });

  assert.deepEqual(
    result.status === "completed" ? result.reconciliations : [],
    [
      { notificationId: "notification-001", status: "failed" },
      { notificationId: "notification-002", status: "reconciled" }
    ]
  );
});

test("a second run inside the minimum interval is skipped", async () => {
  let clock = "2026-09-01T12:00:00.000Z";
  const runner = createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: createService({
      listByDeliveryStatus: async () => []
    }),
    policy,
    now: () => clock
  });

  assert.equal((await runner.reconcile({ metadata })).status, "completed");

  clock = "2026-09-01T12:00:30.000Z";
  const tooSoon = await runner.reconcile({ metadata });
  assert.equal(tooSoon.status, "skipped_too_soon");
  assert.equal(
    tooSoon.status === "skipped_too_soon" ? tooSoon.nextEligibleAt : null,
    "2026-09-01T12:01:00.000Z"
  );

  clock = "2026-09-01T12:01:00.000Z";
  assert.equal((await runner.reconcile({ metadata })).status, "completed");
});

test("a listing failure fails the run without throwing", async () => {
  const result = await createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: createService({
      listByDeliveryStatus: async () => {
        throw new Error("database unavailable");
      }
    }),
    policy,
    now: () => "2026-09-01T12:00:00.000Z"
  }).reconcile({ metadata });

  assert.equal(result.status, "failed");
});
