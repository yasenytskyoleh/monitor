import assert from "node:assert/strict";
import test from "node:test";

import type {
  PatternNotificationDeliveryService,
  PatternNotificationRecord,
  ProductRecordMetadata
} from "@monitor/domain-model";

import {
  createPatternNotificationDeliveryWorkflow,
  type PatternNotificationDeliveryPort
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: "trace-notification-001",
  sourceObservedAtUtc: "2026-09-01T10:30:00.000Z"
};

const notification: PatternNotificationRecord = {
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
  deliveryStatus: "delivery_attempted",
  createdAtUtc: "2026-09-01T10:30:00.000Z",
  updatedAtUtc: "2026-09-01T10:30:00.000Z"
};

const retainedNotification = notification;

type ServiceOverrides = Partial<
  Pick<PatternNotificationDeliveryService, "claimDeliveryAttempt" | "recordDeliveryOutcome">
>;

const unusedService = (): PatternNotificationDeliveryService => ({
  getById: async () => null,
  getByDeduplicationKey: async () => null,
  listByDeliveryStatus: async () => [],
  retain: async () => ({ status: "already_retained", notification: retainedNotification }),
  claimDeliveryAttempt: async () => notification,
  recordDeliveryOutcome: async () => notification,
  reconcileUnconfirmedDelivery: async () => ({ status: "not_found" })
});

const createService = (overrides: ServiceOverrides = {}): PatternNotificationDeliveryService => ({
  ...unusedService(),
  ...overrides
});

type PortOptions = {
  outcome?: unknown;
  throws?: boolean;
};

const createPort = (options: PortOptions = {}) => {
  const calls: PatternNotificationRecord[] = [];
  const port: PatternNotificationDeliveryPort = {
    maxExecutionMs: 10_000,
    deliver: async (request) => {
      calls.push(request.notification);
      if (options.throws) {
        throw new Error("provider exploded");
      }
      // `as never` is deliberate: one test feeds a malformed outcome through the typed port to
      // prove the workflow validates what a provider returns rather than trusting it.
      return (options.outcome ?? {
        status: "delivered",
        completedAt: "2026-09-01T10:31:05.000Z",
        outcomeCode: "telegram_delivered"
      }) as never;
    }
  };

  return { port, calls };
};

const createWorkflow = (
  service: PatternNotificationDeliveryService,
  port: PatternNotificationDeliveryPort
) =>
  createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService: service,
    deliveryPort: port,
    deliveryLeaseDurationMs: 120_000,
    deliveryLeaseOutcomeGraceMs: 5_000,
    deliveryLeaseIdFactory: () => "lease-001",
    now: () => "2026-09-01T10:31:00.000Z"
  });

const request = {
  notificationId: "notification-btc-001",
  metadata,
  expectedVersion: 1
};

test("refuses a lease that cannot cover execution plus the outcome grace", () => {
  const { port } = createPort();

  assert.throws(
    () =>
      createPatternNotificationDeliveryWorkflow({
        patternNotificationDeliveryService: createService(),
        deliveryPort: port,
        deliveryLeaseDurationMs: 10_000,
        deliveryLeaseOutcomeGraceMs: 5_000
      }),
    /lease duration must cover execution/
  );
});

test("claims under a lease before the provider is called, and records with the same lease", async () => {
  const claims: unknown[] = [];
  const records: { deliveryLeaseId: string | undefined }[] = [];
  const { port, calls } = createPort();
  const service = createService({
    claimDeliveryAttempt: async (claim) => {
      assert.deepEqual(calls, [], "the provider must not be called before the claim");
      claims.push(claim);
      return notification;
    },
    recordDeliveryOutcome: async (outcome) => {
      records.push({ deliveryLeaseId: outcome.deliveryLeaseId });
      return { ...notification, deliveryStatus: "delivered", outcomeCode: outcome.outcomeCode };
    }
  });

  const result = await createWorkflow(service, port).deliver(request);

  assert.equal(result.status, "outcome_recorded");
  assert.equal(claims.length, 1);
  assert.equal(calls.length, 1, "exactly one provider call");
  assert.equal(records[0]?.deliveryLeaseId, "lease-001");
});

test("a failed claim never reaches the provider", async () => {
  const { port, calls } = createPort();
  const service = createService({
    claimDeliveryAttempt: async () => {
      throw new Error("already claimed");
    }
  });

  const result = await createWorkflow(service, port).deliver(request);

  assert.equal(result.status, "not_claimed");
  assert.deepEqual(calls, []);
});

test("an unknown notification never reaches the provider", async () => {
  const { port, calls } = createPort();
  const service = createService({ claimDeliveryAttempt: async () => null });

  const result = await createWorkflow(service, port).deliver(request);

  assert.equal(result.status, "not_found");
  assert.deepEqual(calls, []);
});

test("a provider that throws leaves the attempt unconfirmed and is not resent", async () => {
  const recorded: unknown[] = [];
  const { port, calls } = createPort({ throws: true });
  const service = createService({
    recordDeliveryOutcome: async (outcome) => {
      recorded.push(outcome);
      return notification;
    }
  });

  const result = await createWorkflow(service, port).deliver(request);

  assert.equal(result.status, "outcome_unconfirmed");
  assert.equal(calls.length, 1, "the alert is sent at most once");
  assert.deepEqual(recorded, [], "an unconfirmed send must not be recorded as terminal");
});

test("a malformed provider outcome is treated as unconfirmed", async () => {
  const { port } = createPort({ outcome: { status: "delivered", outcomeCode: "" } });
  const service = createService();

  const result = await createWorkflow(service, port).deliver(request);

  assert.equal(result.status, "outcome_unconfirmed");
});

test("a failed terminal write leaves the attempt unconfirmed rather than resending", async () => {
  const { port, calls } = createPort();
  const service = createService({
    recordDeliveryOutcome: async () => {
      throw new Error("database unavailable");
    }
  });

  const result = await createWorkflow(service, port).deliver(request);

  assert.equal(result.status, "outcome_unconfirmed");
  assert.equal(calls.length, 1);
});

test("rejects a request without a notification id", async () => {
  const { port, calls } = createPort();

  const result = await createWorkflow(createService(), port).deliver({
    ...request,
    notificationId: "  "
  });

  assert.equal(result.status, "rejected_validation");
  assert.deepEqual(calls, []);
});
