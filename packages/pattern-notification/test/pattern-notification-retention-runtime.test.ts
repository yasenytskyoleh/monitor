import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryPatternNotificationRecordRepository,
  PatternNotificationDeliveryValidationError,
  createPatternNotificationDeliveryService,
  type ProductRecordMetadata
} from "@monitor/domain-model";

import {
  createPatternNotificationRetentionRuntime,
  type PatternNotificationCandidate
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "notification-run-001",
  originTransitionId: null,
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "detection_pipeline",
  traceId: "notification-trace-001",
  sourceObservedAtUtc: "2026-08-09T10:00:00.000Z"
};

const candidate: PatternNotificationCandidate = {
  notificationId: "notification:candidate-001",
  deduplicationKey: "signal_candidate:candidate-001",
  signalCandidateId: "candidate-001",
  setupDefinitionId: "setup-001",
  setupRevisionId: "revision-001",
  monitoredSymbolId: "btc-usdt",
  setupAggregateResultId: "aggregate-001",
  direction: "consider_long",
  observedAt: "2026-08-09T10:00:00.000Z",
  currentPrice: 67_000,
  policyId: "btc-breakout-v1",
  completedEvaluations: 40,
  positiveOutcomeRate: 0.75,
  averagePercentageMove: 1.25,
  aggregateComputedAt: "2026-08-01T00:00:00.000Z"
};

const createRuntime = () => {
  const repository = new InMemoryPatternNotificationRecordRepository();
  const service = createPatternNotificationDeliveryService({
    patternNotificationRecordRepository: repository
  });
  return {
    repository,
    service,
    runtime: createPatternNotificationRetentionRuntime({
      patternNotificationDeliveryService: service
    })
  };
};

test("retains an immutable eligible notification once and exposes a provider-neutral delivery port", async () => {
  const { repository, runtime } = createRuntime();
  const result = await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });

  assert.deepEqual(result, {
    status: "created",
    notification: {
      ...candidate,
      deliveryStatus: "pending_delivery",
      createdAtUtc: "2026-08-09T10:00:01.000Z",
      updatedAtUtc: "2026-08-09T10:00:01.000Z"
    }
  });
  assert.equal((await repository.listByDeliveryStatus(["pending_delivery"])).length, 1);

  const duplicate = await runtime.retain({
    candidate: { ...candidate, currentPrice: 67_100 },
    retainedAt: "2026-08-09T10:00:02.000Z",
    metadata
  });
  assert.equal(duplicate.status, "already_retained");
  assert.equal(duplicate.notification.currentPrice, 67_000);
});

test("reports concurrent deduplication as one creation and one already-retained notification", async () => {
  const { repository, runtime } = createRuntime();
  const request = {
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  };

  const results = await Promise.all([runtime.retain(request), runtime.retain(request)]);

  assert.deepEqual(
    results.map((result) => result.status).sort(),
    ["already_retained", "created"]
  );
  assert.equal((await repository.listByDeliveryStatus(["pending_delivery"])).length, 1);
});

test("permits exactly one claimed delivery attempt and one terminal, payload-free outcome", async () => {
  const { runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });

  const attempted = await service.claimDeliveryAttempt({
    notificationId: candidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    metadata: { ...metadata, sourceObservedAtUtc: "2026-08-09T10:00:02.000Z" },
    expectedVersion: 1
  });
  assert.equal(attempted?.deliveryStatus, "delivery_attempted");

  const delivered = await service.recordDeliveryOutcome({
    notificationId: candidate.notificationId,
    status: "delivered",
    completedAt: "2026-08-09T10:00:03.000Z",
    outcomeCode: "provider_accepted",
    metadata: { ...metadata, sourceObservedAtUtc: "2026-08-09T10:00:03.000Z" },
    expectedVersion: 2
  });
  assert.deepEqual(
    { status: delivered?.deliveryStatus, code: delivered?.outcomeCode },
    { status: "delivered", code: "provider_accepted" }
  );

  await assert.rejects(
    () =>
      service.claimDeliveryAttempt({
        notificationId: candidate.notificationId,
        attemptedAt: "2026-08-09T10:00:04.000Z",
        metadata,
        expectedVersion: 3
      }),
    (error: unknown) => error instanceof PatternNotificationDeliveryValidationError
  );
});

test("rejects malformed notifications and prevents terminal outcomes without a delivery claim", async () => {
  const { runtime, service } = createRuntime();
  assert.deepEqual(
    await runtime.retain({
      candidate: { ...candidate, completedEvaluations: 0 },
      retainedAt: "2026-08-09T10:00:01.000Z",
      metadata
    }),
    {
      status: "rejected_validation",
      reason: "eligible notification candidate and retainedAt are required"
    }
  );
  assert.deepEqual(
    await runtime.retain({
      candidate,
      retainedAt: "2026-08-09T09:59:59.000Z",
      metadata
    }),
    {
      status: "rejected_validation",
      reason: "eligible notification candidate and retainedAt are required"
    }
  );

  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  await assert.rejects(
    () =>
      service.recordDeliveryOutcome({
        notificationId: candidate.notificationId,
        status: "failed",
        completedAt: "2026-08-09T10:00:03.000Z",
        outcomeCode: "provider_rejected",
        metadata,
        expectedVersion: 1
      }),
    (error: unknown) => error instanceof PatternNotificationDeliveryValidationError
  );
});
