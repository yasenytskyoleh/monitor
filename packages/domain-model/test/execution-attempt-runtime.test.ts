import assert from "node:assert/strict";
import test from "node:test";

import {
  ExecutionAttemptAuditValidationError,
  ExecutionAttemptRuntimeAuditAlreadyRecordedError,
  ExecutionAttemptRuntimeAuditPersistenceError,
  ExecutionAttemptRuntimeValidationError,
  InMemoryExecutionAttemptAuditRepository,
  type ExecutionAttemptAudit,
  type ExecutionAttemptAuditService,
  type DownstreamActionExecutorOutcome,
  type ProductRecordMetadata,
  type RoutedActionExecutionEnvelope,
  createExecutionAttemptAuditService,
  createExecutionAttemptRuntime,
  createExecutionAttemptRuntimeFromRepositories
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-execution-runtime-001",
  originTransitionId: "transition-execution-runtime-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-execution-runtime-001",
  sourceObservedAtUtc: "2026-07-28T10:00:05.000Z"
};

const envelope: RoutedActionExecutionEnvelope = {
  id: "execution-envelope-runtime-001",
  sourceRoutingResultId: "routing-result-runtime-001",
  sourceReviewDecisionId: "review-decision-runtime-001",
  actionTarget: "activate_setup_revision",
  actionCommandType: "ActivateSetupDefinitionRevisionCommand",
  targetEntityRefs: {
    setupFamilyId: "setup-family-runtime-001",
    setupRevisionId: "setup-revision-runtime-001"
  },
  routeMetadataSnapshot: {
    routeStatus: "routed",
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_activation_follow_up"
  },
  executionPayloadSnapshot: {
    commandType: "ActivateSetupDefinitionRevisionCommand",
    target: "activate_setup_revision",
    commandInput: {
      setupRevisionId: "setup-revision-runtime-001",
      setupFamilyId: "setup-family-runtime-001",
      sourceReviewDecisionId: "review-decision-runtime-001",
      sourceRoutingResultId: "routing-result-runtime-001"
    }
  },
  executionStatus: "prepared",
  preparedBy: "execution-preparer",
  preparedAt: "2026-07-28T10:00:00.000Z",
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z"
};

const buildAudit = (): ExecutionAttemptAudit => ({
  attemptId: "execution-attempt-runtime-001",
  routedActionExecutionEnvelopeId: envelope.id,
  reviewDecisionRoutingResultId: envelope.sourceRoutingResultId,
  researchReviewDecisionId: envelope.sourceReviewDecisionId,
  actionTarget: envelope.actionTarget,
  downstreamCommandType: envelope.actionCommandType,
  status: "received",
  attemptedBy: "execution-runtime",
  attemptedAt: "2026-07-28T10:00:00.000Z",
  warningCodes: [],
  createdAtUtc: "2026-07-28T10:00:00.000Z",
  updatedAtUtc: "2026-07-28T10:00:00.000Z"
});

const createFixture = (execute: () => Promise<{ status: "executed" | "rejected"; outcomeCode: string }>) => {
  const repository = new InMemoryExecutionAttemptAuditRepository();
  const runtime = createExecutionAttemptRuntime({
    executionAttemptAuditService: createExecutionAttemptAuditService({
      executionAttemptAuditRepository: repository
    }),
    downstreamActionExecutor: { execute }
  });
  return { repository, runtime };
};

const createRuntimeWithAuditService = (
  executionAttemptAuditService: ExecutionAttemptAuditService,
  execute: () => Promise<{ status: "executed" | "rejected"; outcomeCode: string }>
) =>
  createExecutionAttemptRuntime({
    executionAttemptAuditService,
    downstreamActionExecutor: { execute }
  });

test("runtime records an executed terminal audit after dispatch", async () => {
  const { repository, runtime } = createFixture(async () => ({
    status: "executed",
    outcomeCode: "setup_revision_activated"
  }));

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "executed");
  assert.equal(result.audit.outcomeCode, "setup_revision_activated");
  assert.equal((await repository.getById(result.audit.attemptId))?.status, "executed");
});

test("runtime records a rejected terminal audit without executing a provider retry", async () => {
  const { runtime } = createFixture(async () => ({
    status: "rejected",
    outcomeCode: "command_rejected"
  }));

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "rejected");
  assert.equal(result.audit.status, "rejected");
});

test("runtime sanitizes executor failures into a failed terminal audit", async () => {
  const { runtime } = createFixture(async () => {
    throw new Error("provider token should not be stored");
  });

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "failed");
  assert.equal(result.audit.outcomeCode, "executor_failed");
  assert.deepEqual(result.audit.warningCodes, ["executor_failure"]);
  assert.equal(result.audit.outcomeSummary, undefined);
});

test("runtime sanitizes malformed executor outcomes into failed terminal evidence", async () => {
  const { runtime } = createFixture(async () =>
    ({
      status: "executed",
      outcomeCode: "provider response should not be retained"
    }) as DownstreamActionExecutorOutcome
  );

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "failed");
  assert.equal(result.audit.outcomeCode, "executor_invalid_outcome");
  assert.deepEqual(result.audit.warningCodes, ["executor_failure"]);
  assert.equal(result.audit.outcomeSummary, undefined);
});

test("runtime rejects executor warning text that is not a stable identifier", async () => {
  const { runtime } = createFixture(async () =>
    ({
      status: "rejected",
      outcomeCode: "command_rejected",
      warningCodes: ["provider response should not be retained"]
    }) as DownstreamActionExecutorOutcome
  );

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "failed");
  assert.equal(result.audit.outcomeCode, "executor_invalid_outcome");
  assert.deepEqual(result.audit.warningCodes, ["executor_failure"]);
});

test("runtime does not retain executor-provided text summaries", async () => {
  const { runtime } = createFixture(async () =>
    ({
      status: "executed",
      outcomeCode: "setup_revision_activated",
      outcomeSummary: "provider response should not be retained"
    }) as unknown as DownstreamActionExecutorOutcome
  );

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "executed");
  assert.equal(result.audit.outcomeSummary, undefined);
});

test("runtime does not dispatch when received audit persistence fails", async () => {
  let executed = false;
  const runtime = createRuntimeWithAuditService(
    {
      recordReceivedAttempt: async () => {
        throw new Error("database connection details");
      },
      recordTerminalOutcome: async () => null
    },
    async () => {
      executed = true;
      return { status: "executed", outcomeCode: "should_not_run" };
    }
  );

  await assert.rejects(
    () => runtime.execute({ audit: buildAudit(), envelope, metadata }),
    (error: unknown) =>
      error instanceof ExecutionAttemptRuntimeAuditPersistenceError &&
      error.phase === "received" &&
      error.attemptId === "execution-attempt-runtime-001" &&
      !error.message.includes("database connection details")
  );
  assert.equal(executed, false);
});

test("runtime does not dispatch a prepared envelope more than once", async () => {
  let executionCount = 0;
  const { runtime } = createFixture(async () => {
    executionCount += 1;
    return { status: "executed", outcomeCode: "setup_revision_activated" };
  });

  await runtime.execute({ audit: buildAudit(), envelope, metadata });

  await assert.rejects(
    () =>
      runtime.execute({
        audit: { ...buildAudit(), attemptId: "execution-attempt-runtime-duplicate-001" },
        envelope,
        metadata
      }),
    (error: unknown) =>
      error instanceof ExecutionAttemptRuntimeAuditAlreadyRecordedError &&
      error.attemptId === "execution-attempt-runtime-duplicate-001"
  );
  assert.equal(executionCount, 1);
});

test("runtime keeps invalid received evidence distinct from persistence failures", async () => {
  let executed = false;
  const { runtime } = createFixture(async () => {
    executed = true;
    return { status: "executed", outcomeCode: "should_not_run" };
  });

  await assert.rejects(
    () =>
      runtime.execute({
        audit: { ...buildAudit(), attemptedAt: "invalid-timestamp" },
        envelope,
        metadata
      }),
    (error: unknown) => error instanceof ExecutionAttemptAuditValidationError
  );
  assert.equal(executed, false);
});

test("runtime surfaces terminal audit persistence as a safe reconciliation error", async () => {
  const audit = buildAudit();
  const runtime = createRuntimeWithAuditService(
    {
      recordReceivedAttempt: async () => audit,
      recordTerminalOutcome: async () => {
        throw new Error("database connection details");
      }
    },
    async () => ({ status: "executed", outcomeCode: "setup_revision_activated" })
  );

  await assert.rejects(
    () => runtime.execute({ audit, envelope, metadata }),
    (error: unknown) =>
      error instanceof ExecutionAttemptRuntimeAuditPersistenceError &&
      error.phase === "terminal" &&
      error.attemptId === audit.attemptId &&
      !error.message.includes("database connection details")
  );
});

test("runtime rejects audit and envelope correlation mismatches before dispatch", async () => {
  let executed = false;
  const { runtime } = createFixture(async () => {
    executed = true;
    return { status: "executed", outcomeCode: "should_not_run" };
  });

  await assert.rejects(
    () =>
      runtime.execute({
        audit: { ...buildAudit(), routedActionExecutionEnvelopeId: "different-envelope" },
        envelope,
        metadata
      }),
    (error: unknown) => error instanceof ExecutionAttemptRuntimeValidationError
  );
  assert.equal(executed, false);
});

test("runtime factory composes the audit service from a repository bundle", async () => {
  const repository = new InMemoryExecutionAttemptAuditRepository();
  const runtime = createExecutionAttemptRuntimeFromRepositories(
    { executionAttemptAuditRepository: repository },
    { execute: async () => ({ status: "executed", outcomeCode: "setup_revision_activated" }) }
  );

  const result = await runtime.execute({ audit: buildAudit(), envelope, metadata });

  assert.equal(result.status, "executed");
  assert.equal((await repository.getById(result.audit.attemptId))?.status, "executed");
});
