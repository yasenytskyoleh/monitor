import assert from "node:assert/strict";
import test from "node:test";

import type {
  PatternNotificationDeliveryService,
  PatternNotificationRecord,
  ProductRecordMetadata
} from "@monitor/domain-model";

import {
  createPatternNotificationDeliveryDispatch,
  type PatternNotificationDeliveryWorkflow
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: "trace-notification-001",
  sourceObservedAtUtc: "2026-09-01T10:30:00.000Z"
};

const pending = (notificationId: string): PatternNotificationRecord => ({
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
  deliveryStatus: "pending_delivery",
  createdAtUtc: "2026-09-01T10:30:00.000Z",
  updatedAtUtc: "2026-09-01T10:30:00.000Z"
});

const retainedNotification = pending("notification-stub");

const policy = { minRunIntervalMs: 60_000, maxDeliveriesPerRun: 2 };

const createService = (
  listByDeliveryStatus: PatternNotificationDeliveryService["listByDeliveryStatus"]
): PatternNotificationDeliveryService => ({
  getById: async () => null,
  getByDeduplicationKey: async () => null,
  listByDeliveryStatus,
  retain: async () => ({ status: "already_retained", notification: retainedNotification }),
  claimDeliveryAttempt: async () => null,
  recordDeliveryOutcome: async () => null,
  reconcileUnconfirmedDelivery: async () => ({ status: "not_found" })
});

const createWorkflow = (
  deliver: PatternNotificationDeliveryWorkflow["deliver"]
): PatternNotificationDeliveryWorkflow => ({ deliver });

test("rejects an invalid dispatch policy", () => {
  assert.throws(
    () =>
      createPatternNotificationDeliveryDispatch({
        patternNotificationDeliveryService: createService(async () => []),
        deliveryWorkflow: createWorkflow(async () => ({ status: "not_found" })),
        policy: { ...policy, maxDeliveriesPerRun: 0 }
      }),
    /policy is invalid/
  );
});

test("selects only pending notifications, bounded by the per-run limit", async () => {
  const listed: unknown[] = [];
  const delivered: string[] = [];
  const dispatch = createPatternNotificationDeliveryDispatch({
    patternNotificationDeliveryService: createService(async (statuses, limit) => {
      listed.push({ statuses, limit });
      return [pending("notification-001"), pending("notification-002")];
    }),
    deliveryWorkflow: createWorkflow(async (request) => {
      delivered.push(request.notificationId);
      return { status: "not_found" };
    }),
    policy
  });

  const result = await dispatch.dispatch({
    runAt: "2026-09-01T12:00:00.000Z",
    metadata
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(listed, [{ statuses: ["pending_delivery"], limit: 2 }]);
  assert.deepEqual(delivered, ["notification-001", "notification-002"]);
});

test("a workflow that throws is reported as unconfirmed rather than retried", async () => {
  const attempts: string[] = [];
  const result = await createPatternNotificationDeliveryDispatch({
    patternNotificationDeliveryService: createService(async () => [pending("notification-001")]),
    deliveryWorkflow: createWorkflow(async (request) => {
      attempts.push(request.notificationId);
      throw new Error("workflow exploded");
    }),
    policy
  }).dispatch({ runAt: "2026-09-01T12:00:00.000Z", metadata });

  assert.deepEqual(
    result.status === "completed" ? result.deliveries : [],
    [{ notificationId: "notification-001", status: "outcome_unconfirmed" }]
  );
  assert.equal(attempts.length, 1, "a failed delivery is not retried inside the run");
});

test("a second dispatch inside the minimum interval is skipped", async () => {
  const dispatch = createPatternNotificationDeliveryDispatch({
    patternNotificationDeliveryService: createService(async () => []),
    deliveryWorkflow: createWorkflow(async () => ({ status: "not_found" })),
    policy
  });

  assert.equal(
    (await dispatch.dispatch({ runAt: "2026-09-01T12:00:00.000Z", metadata })).status,
    "completed"
  );

  const tooSoon = await dispatch.dispatch({ runAt: "2026-09-01T12:00:30.000Z", metadata });
  assert.equal(tooSoon.status, "skipped_too_soon");
});

test("rejects a run without a valid timestamp", async () => {
  const result = await createPatternNotificationDeliveryDispatch({
    patternNotificationDeliveryService: createService(async () => []),
    deliveryWorkflow: createWorkflow(async () => ({ status: "not_found" })),
    policy
  }).dispatch({ runAt: "not-a-timestamp", metadata });

  assert.equal(result.status, "rejected_validation");
});
