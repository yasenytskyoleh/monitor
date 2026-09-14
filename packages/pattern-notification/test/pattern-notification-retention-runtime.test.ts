import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryPatternNotificationRecordRepository,
  PatternNotificationDeliveryValidationError,
  createPatternNotificationDeliveryService,
  type ProductRecordMetadata
} from "@monitor/domain-model";

import {
  createPatternNotificationDeliveryDispatch,
  createPatternNotificationDeliveryReconciliationRunner,
  createPatternNotificationDeliveryWorkflow,
  createPatternNotificationRetentionRuntime,
  type PatternNotificationCandidate,
  type PatternNotificationDeliveryPort
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
  assert.equal((await repository.listByDeliveryStatus(["pending_delivery"], 10)).length, 1);

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
  assert.equal((await repository.listByDeliveryStatus(["pending_delivery"], 10)).length, 1);
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

test("reconciles only stale, unconfirmed delivery attempts without sending a duplicate alert", async () => {
  const { runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  await service.claimDeliveryAttempt({
    notificationId: candidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    metadata,
    expectedVersion: 1
  });

  assert.deepEqual(
    await service.reconcileUnconfirmedDelivery({
      notificationId: candidate.notificationId,
      reconciledAt: "2026-08-09T10:04:59.000Z",
      minAttemptAgeMs: 5 * 60 * 1_000,
      metadata,
      expectedVersion: 2
    }),
    {
      status: "not_stale",
      notification: {
        ...candidate,
        deliveryStatus: "delivery_attempted",
        deliveryAttemptedAt: "2026-08-09T10:00:02.000Z",
        createdAtUtc: "2026-08-09T10:00:01.000Z",
        updatedAtUtc: "2026-08-09T10:00:02.000Z"
      }
    }
  );

  const reconciled = await service.reconcileUnconfirmedDelivery({
    notificationId: candidate.notificationId,
    reconciledAt: "2026-08-09T10:05:02.000Z",
    minAttemptAgeMs: 5 * 60 * 1_000,
    metadata: { ...metadata, sourceObservedAtUtc: "2026-08-09T10:05:02.000Z" },
    expectedVersion: 2
  });
  assert.equal(reconciled.status, "reconciled");
  if (reconciled.status !== "reconciled") {
    assert.fail("expected the stale delivery attempt to be reconciled");
  }
  assert.deepEqual(
    {
      status: reconciled.status,
      deliveryStatus: reconciled.notification.deliveryStatus,
      code: reconciled.notification.outcomeCode
    },
    { status: "reconciled", deliveryStatus: "failed", code: "delivery_outcome_unconfirmed" }
  );
  assert.deepEqual(
    await service.reconcileUnconfirmedDelivery({
      notificationId: candidate.notificationId,
      reconciledAt: "2026-08-09T10:10:02.000Z",
      minAttemptAgeMs: 5 * 60 * 1_000,
      metadata,
      expectedVersion: 3
    }),
    { status: "already_terminal", notification: reconciled.notification }
  );
});

test("enforces durable delivery-lease ownership and expiry before reconciliation", async () => {
  const { runtime, service } = createRuntime();
  await runtime.retain({ candidate, retainedAt: "2026-08-09T10:00:01.000Z", metadata });
  await assert.rejects(
    () =>
      service.claimDeliveryAttempt({
        notificationId: candidate.notificationId,
        attemptedAt: "2026-08-09T10:00:02.000Z",
        deliveryLeaseId: "delivery-lease-invalid",
        deliveryLeaseExpiresAt: "2026-08-09T10:00:02.000Z",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) => error instanceof PatternNotificationDeliveryValidationError
  );
  await service.claimDeliveryAttempt({
    notificationId: candidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    deliveryLeaseId: "delivery-lease-001",
    deliveryLeaseExpiresAt: "2026-08-09T10:05:02.000Z",
    metadata,
    expectedVersion: null
  });

  assert.equal(
    (
      await service.reconcileUnconfirmedDelivery({
        notificationId: candidate.notificationId,
        reconciledAt: "2026-08-09T10:05:31.000Z",
        minAttemptAgeMs: 60_000,
        leaseClockSkewToleranceMs: 30_000,
        metadata,
        expectedVersion: null
      })
    ).status,
    "lease_active"
  );
  await assert.rejects(
    () =>
      service.recordDeliveryOutcome({
        notificationId: candidate.notificationId,
        status: "delivered",
        completedAt: "2026-08-09T10:05:02.000Z",
        outcomeCode: "telegram_accepted",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) => error instanceof PatternNotificationDeliveryValidationError
  );
  await assert.rejects(
    () =>
      service.reconcileUnconfirmedDelivery({
        notificationId: candidate.notificationId,
        reconciledAt: "2026-08-09T10:05:32.000Z",
        minAttemptAgeMs: 60_000,
        leaseClockSkewToleranceMs: Number.MAX_VALUE,
        metadata,
        expectedVersion: null
      }),
    (error: unknown) => error instanceof PatternNotificationDeliveryValidationError
  );
  const reconciled = await service.reconcileUnconfirmedDelivery({
    notificationId: candidate.notificationId,
    reconciledAt: "2026-08-09T10:05:32.000Z",
    minAttemptAgeMs: 60_000,
    leaseClockSkewToleranceMs: 30_000,
    metadata,
    expectedVersion: null
  });
  assert.equal(reconciled.status, "reconciled");
  if (reconciled.status !== "reconciled") assert.fail("expected lease expiry reconciliation");
  assert.equal(reconciled.notification.deliveryLeaseId, undefined);
});

test("does not overwrite a terminal outcome recorded while reconciliation is in progress", async () => {
  const { repository, runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  await service.claimDeliveryAttempt({
    notificationId: candidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    metadata,
    expectedVersion: 1
  });

  const originalUpdate = repository.update.bind(repository);
  repository.update = async (request) => {
    if (request.notification.outcomeCode === "delivery_outcome_unconfirmed") {
      await service.recordDeliveryOutcome({
        notificationId: candidate.notificationId,
        status: "delivered",
        completedAt: "2026-08-09T10:05:02.000Z",
        outcomeCode: "telegram_accepted",
        metadata,
        expectedVersion: null
      });
    }
    return originalUpdate(request);
  };

  assert.deepEqual(
    await service.reconcileUnconfirmedDelivery({
      notificationId: candidate.notificationId,
      reconciledAt: "2026-08-09T10:05:02.000Z",
      minAttemptAgeMs: 5 * 60 * 1_000,
      metadata,
      expectedVersion: null
    }),
    {
      status: "already_terminal",
      notification: {
        ...candidate,
        deliveryStatus: "delivered",
        deliveryAttemptedAt: "2026-08-09T10:00:02.000Z",
        completedAt: "2026-08-09T10:05:02.000Z",
        outcomeCode: "telegram_accepted",
        createdAtUtc: "2026-08-09T10:00:01.000Z",
        updatedAtUtc: "2026-08-09T10:05:02.000Z"
      }
    }
  );
});

test("delivers a claimed notification once and records the provider-neutral outcome", async () => {
  const { runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  let deliveredNotificationId: string | null = null;
  const deliveryPort: PatternNotificationDeliveryPort = {
    maxExecutionMs: 60_000,
    async deliver({ notification }) {
      deliveredNotificationId = notification.notificationId;
      assert.equal(notification.deliveryStatus, "delivery_attempted");
      assert.equal(notification.deliveryLeaseId, "delivery-lease-workflow");
      assert.equal(notification.deliveryLeaseExpiresAt, "2026-08-09T10:01:03.000Z");
      return {
        status: "delivered",
        completedAt: "2026-08-09T10:00:03.000Z",
        outcomeCode: "telegram_accepted"
      };
    }
  };
  const workflow = createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService: service,
    deliveryPort,
    deliveryLeaseDurationMs: 61_000,
    deliveryLeaseOutcomeGraceMs: 1_000,
    deliveryLeaseIdFactory: () => "delivery-lease-workflow",
    now: () => "2026-08-09T10:00:02.000Z"
  });

  const result = await workflow.deliver({
    notificationId: candidate.notificationId,
    metadata,
    expectedVersion: 1
  });

  assert.equal(deliveredNotificationId, candidate.notificationId);
  assert.equal(result.status, "outcome_recorded");
  if (result.status !== "outcome_recorded") {
    assert.fail("expected the delivery outcome to be recorded");
  }
  assert.deepEqual(
    {
      deliveryStatus: result.notification.deliveryStatus,
      outcomeCode: result.notification.outcomeCode,
      deliveryLeaseId: result.notification.deliveryLeaseId,
      deliveryLeaseExpiresAt: result.notification.deliveryLeaseExpiresAt
    },
    {
      deliveryStatus: "delivered",
      outcomeCode: "telegram_accepted",
      deliveryLeaseId: undefined,
      deliveryLeaseExpiresAt: undefined
    }
  );
});

test("requires a lease to cover delivery execution and outcome-recording grace", () => {
  const { service } = createRuntime();
  const deliveryPort: PatternNotificationDeliveryPort = {
    maxExecutionMs: 60_000,
    async deliver() {
      return {
        status: "delivered",
        completedAt: "2026-08-09T10:00:03.000Z",
        outcomeCode: "telegram_accepted"
      };
    }
  };

  assert.throws(
    () =>
      createPatternNotificationDeliveryWorkflow({
        patternNotificationDeliveryService: service,
        deliveryPort,
        deliveryLeaseDurationMs: 60_000,
        deliveryLeaseOutcomeGraceMs: 1_000
      }),
    /lease duration must cover/
  );
  assert.throws(
    () =>
      createPatternNotificationDeliveryWorkflow({
        patternNotificationDeliveryService: service,
        deliveryPort,
        deliveryLeaseDurationMs: 61_000,
        deliveryLeaseOutcomeGraceMs: 0
      }),
    /lease duration must cover/
  );
  assert.throws(
    () =>
      createPatternNotificationDeliveryWorkflow({
        patternNotificationDeliveryService: service,
        deliveryPort,
        deliveryLeaseDurationMs: 61_000,
        deliveryLeaseOutcomeGraceMs: 1.5
      }),
    /lease duration must cover/
  );
});

test("allows only one concurrent workflow caller to reach the delivery port", async () => {
  const { runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  let deliveries = 0;
  const workflow = createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService: service,
    deliveryPort: {
      maxExecutionMs: 60_000,
      async deliver() {
        deliveries += 1;
        return {
          status: "failed",
          completedAt: "2026-08-09T10:00:03.000Z",
          outcomeCode: "telegram_rejected"
        };
      }
    },
    deliveryLeaseDurationMs: 61_000,
    deliveryLeaseOutcomeGraceMs: 1_000,
    deliveryLeaseIdFactory: () => "delivery-lease-workflow",
    now: () => "2026-08-09T10:00:02.000Z"
  });
  const request = {
    notificationId: candidate.notificationId,
    metadata,
    expectedVersion: null
  };

  const results = await Promise.all([workflow.deliver(request), workflow.deliver(request)]);

  assert.equal(deliveries, 1);
  assert.deepEqual(
    results.map((result) => result.status).sort(),
    ["not_claimed", "outcome_recorded"]
  );
});

test("does not overwrite reconciliation when terminal recording races with it", async () => {
  const { repository, runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  const originalUpdate = repository.update.bind(repository);
  repository.update = async (request) => {
    if (request.notification.outcomeCode === "telegram_accepted") {
      await service.reconcileUnconfirmedDelivery({
        notificationId: candidate.notificationId,
        reconciledAt: "2026-08-09T10:05:02.000Z",
        minAttemptAgeMs: 5 * 60 * 1_000,
        metadata,
        expectedVersion: null
      });
    }
    return originalUpdate(request);
  };
  const workflow = createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService: service,
    deliveryPort: {
      maxExecutionMs: 60_000,
      async deliver() {
        return {
          status: "delivered",
          completedAt: "2026-08-09T10:05:02.000Z",
          outcomeCode: "telegram_accepted"
        };
      }
    },
    deliveryLeaseDurationMs: 61_000,
    deliveryLeaseOutcomeGraceMs: 1_000,
    deliveryLeaseIdFactory: () => "delivery-lease-workflow",
    now: () => "2026-08-09T10:00:02.000Z"
  });

  assert.deepEqual(
    await workflow.deliver({
      notificationId: candidate.notificationId,
      metadata,
      expectedVersion: null
    }),
    { status: "outcome_unconfirmed" }
  );
  assert.deepEqual(
    {
      deliveryStatus: (await repository.getById(candidate.notificationId))?.deliveryStatus,
      outcomeCode: (await repository.getById(candidate.notificationId))?.outcomeCode
    },
    { deliveryStatus: "failed", outcomeCode: "delivery_outcome_unconfirmed" }
  );
});

test("does not send when a notification cannot be claimed and leaves uncertain outcomes for reconciliation", async () => {
  const { repository, runtime, service } = createRuntime();
  await runtime.retain({
    candidate,
    retainedAt: "2026-08-09T10:00:01.000Z",
    metadata
  });
  let deliveries = 0;
  const deliveryPort: PatternNotificationDeliveryPort = {
    maxExecutionMs: 60_000,
    async deliver() {
      deliveries += 1;
      throw new Error("simulated provider interruption");
    }
  };
  const workflow = createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService: service,
    deliveryPort,
    deliveryLeaseDurationMs: 61_000,
    deliveryLeaseOutcomeGraceMs: 1_000,
    deliveryLeaseIdFactory: () => "delivery-lease-workflow",
    now: () => "2026-08-09T10:00:02.000Z"
  });

  assert.deepEqual(
    await workflow.deliver({
      notificationId: "notification:missing",
      metadata,
      expectedVersion: 1
    }),
    { status: "not_found" }
  );
  assert.equal(deliveries, 0);

  assert.deepEqual(
    await workflow.deliver({
      notificationId: candidate.notificationId,
      metadata,
      expectedVersion: 1
    }),
    { status: "outcome_unconfirmed" }
  );
  assert.equal(deliveries, 1);
  assert.equal(
    (await repository.getById(candidate.notificationId))?.deliveryStatus,
    "delivery_attempted"
  );
  assert.deepEqual(
    await workflow.deliver({
      notificationId: candidate.notificationId,
      metadata,
      expectedVersion: 2
    }),
    { status: "not_claimed" }
  );
  assert.equal(deliveries, 1);
});

test("dispatches a bounded pending notification set at the declared cadence", async () => {
  const { runtime, service } = createRuntime();
  const secondCandidate = {
    ...candidate,
    notificationId: "notification:candidate-002",
    deduplicationKey: "signal_candidate:candidate-002",
    signalCandidateId: "candidate-002"
  };
  await runtime.retain({ candidate, retainedAt: "2026-08-09T10:00:01.000Z", metadata });
  await runtime.retain({ candidate: secondCandidate, retainedAt: "2026-08-09T10:00:01.000Z", metadata });
  let deliveries = 0;
  const workflow = createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService: service,
    deliveryPort: {
      maxExecutionMs: 60_000,
      async deliver({ notification }) {
        deliveries += 1;
        assert.equal(notification.deliveryAttemptedAt, "2026-08-09T10:05:03.000Z");
        assert.equal(notification.deliveryLeaseExpiresAt, "2026-08-09T10:06:04.000Z");
        return {
          status: "delivered",
          completedAt: "2026-08-09T10:05:04.000Z",
          outcomeCode: "telegram_accepted"
        };
      }
    },
    deliveryLeaseDurationMs: 61_000,
    deliveryLeaseOutcomeGraceMs: 1_000,
    deliveryLeaseIdFactory: () => "delivery-lease-workflow",
    now: () => "2026-08-09T10:05:03.000Z"
  });
  const dispatch = createPatternNotificationDeliveryDispatch({
    patternNotificationDeliveryService: service,
    deliveryWorkflow: workflow,
    policy: {
      minRunIntervalMs: 60_000,
      maxDeliveriesPerRun: 1
    }
  });

  assert.deepEqual(
    await dispatch.dispatch({ runAt: "2026-08-09T10:05:02.000Z", metadata }),
    {
      status: "completed",
      deliveries: [{ notificationId: candidate.notificationId, status: "outcome_recorded" }]
    }
  );
  assert.equal(deliveries, 1);
  assert.deepEqual(
    await dispatch.dispatch({ runAt: "2026-08-09T10:05:30.000Z", metadata }),
    { status: "skipped_too_soon", nextEligibleAt: "2026-08-09T10:06:02.000Z" }
  );
  assert.equal(deliveries, 1);
});

test("reconciles a bounded claimed set without overriding an active delivery lease", async () => {
  const { runtime, service } = createRuntime();
  const leasedCandidate = {
    ...candidate,
    notificationId: "notification:candidate-002",
    deduplicationKey: "signal_candidate:candidate-002",
    signalCandidateId: "candidate-002"
  };
  await runtime.retain({ candidate, retainedAt: "2026-08-09T10:00:01.000Z", metadata });
  await runtime.retain({ candidate: leasedCandidate, retainedAt: "2026-08-09T10:00:01.000Z", metadata });
  await service.claimDeliveryAttempt({
    notificationId: candidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    deliveryLeaseId: "expired-lease",
    deliveryLeaseExpiresAt: "2026-08-09T10:01:03.000Z",
    metadata,
    expectedVersion: 1
  });
  await service.claimDeliveryAttempt({
    notificationId: leasedCandidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    deliveryLeaseId: "active-lease",
    deliveryLeaseExpiresAt: "2026-08-09T10:06:03.000Z",
    metadata,
    expectedVersion: 1
  });
  const runTimes = ["2026-08-09T10:05:03.000Z", "2026-08-09T10:05:30.000Z"];
  const runner = createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: service,
    policy: {
      minRunIntervalMs: 60_000,
      maxReconciliationsPerRun: 2,
      minAttemptAgeMs: 60_000,
      leaseClockSkewToleranceMs: 30_000
    },
    now: () => runTimes.shift() ?? ""
  });

  assert.deepEqual(await runner.reconcile({ metadata }), {
    status: "completed",
    reconciliations: [
      { notificationId: candidate.notificationId, status: "reconciled" },
      { notificationId: leasedCandidate.notificationId, status: "lease_active" }
    ]
  });
  assert.deepEqual(await runner.reconcile({ metadata }), {
    status: "skipped_too_soon",
    nextEligibleAt: "2026-08-09T10:06:03.000Z"
  });
  assert.equal(
    (await service.getById(candidate.notificationId))?.outcomeCode,
    "delivery_outcome_unconfirmed"
  );
  assert.equal(
    (await service.getById(leasedCandidate.notificationId))?.deliveryStatus,
    "delivery_attempted"
  );
});

test("validates reconciliation policy and prevents concurrent runs", async () => {
  const { service } = createRuntime();
  const policy = {
    minRunIntervalMs: 60_000,
    maxReconciliationsPerRun: 1,
    minAttemptAgeMs: 60_000,
    leaseClockSkewToleranceMs: 30_000
  };
  assert.throws(
    () =>
      createPatternNotificationDeliveryReconciliationRunner({
        patternNotificationDeliveryService: service,
        policy: { ...policy, leaseClockSkewToleranceMs: 0 }
      }),
    /reconciliation policy is invalid/
  );

  let releaseList: (() => void) | undefined;
  const listStarted = new Promise<void>((resolve) => {
    service.listByDeliveryStatus = async () => {
      resolve();
      await new Promise<void>((release) => {
        releaseList = release;
      });
      return [];
    };
  });
  const runner = createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: service,
    policy,
    now: () => "2026-08-09T10:05:03.000Z"
  });

  const first = runner.reconcile({ metadata });
  await listStarted;
  assert.deepEqual(await runner.reconcile({ metadata }), { status: "skipped_in_progress" });
  releaseList?.();
  assert.deepEqual(await first, { status: "completed", reconciliations: [] });
});

test("preserves a terminal outcome that wins the reconciliation race", async () => {
  const { repository, runtime, service } = createRuntime();
  await runtime.retain({ candidate, retainedAt: "2026-08-09T10:00:01.000Z", metadata });
  await service.claimDeliveryAttempt({
    notificationId: candidate.notificationId,
    attemptedAt: "2026-08-09T10:00:02.000Z",
    metadata,
    expectedVersion: 1
  });
  const originalUpdate = repository.update.bind(repository);
  repository.update = async (request) => {
    if (request.notification.outcomeCode === "delivery_outcome_unconfirmed") {
      await service.recordDeliveryOutcome({
        notificationId: candidate.notificationId,
        status: "delivered",
        completedAt: "2026-08-09T10:05:03.000Z",
        outcomeCode: "telegram_accepted",
        metadata,
        expectedVersion: null
      });
    }
    return originalUpdate(request);
  };
  const runner = createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService: service,
    policy: {
      minRunIntervalMs: 60_000,
      maxReconciliationsPerRun: 1,
      minAttemptAgeMs: 60_000,
      leaseClockSkewToleranceMs: 30_000
    },
    now: () => "2026-08-09T10:05:03.000Z"
  });

  assert.deepEqual(await runner.reconcile({ metadata }), {
    status: "completed",
    reconciliations: [{ notificationId: candidate.notificationId, status: "already_terminal" }]
  });
  assert.equal((await service.getById(candidate.notificationId))?.outcomeCode, "telegram_accepted");
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
  await assert.rejects(
    () =>
      service.reconcileUnconfirmedDelivery({
        notificationId: candidate.notificationId,
        reconciledAt: "2026-08-09T10:00:03.000Z",
        minAttemptAgeMs: 0,
        metadata,
        expectedVersion: 1
      }),
    (error: unknown) => error instanceof PatternNotificationDeliveryValidationError
  );
});
