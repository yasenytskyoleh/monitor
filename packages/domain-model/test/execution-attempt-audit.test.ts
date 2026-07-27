import assert from "node:assert/strict";
import test from "node:test";

import {
  ExecutionAttemptAuditValidationError,
  InMemoryExecutionAttemptAuditRepository,
  RepositoryError,
  type ExecutionAttemptAudit,
  type ProductRecordMetadata,
  createExecutionAttemptAuditService
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-execution-audit-001",
  originTransitionId: "transition-execution-audit-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-execution-audit-001",
  sourceObservedAtUtc: "2026-07-27T12:00:00.000Z"
};

const buildAudit = (): ExecutionAttemptAudit => ({
  attemptId: "execution-attempt-001",
  routedActionExecutionEnvelopeId: "execution-envelope-001",
  reviewDecisionRoutingResultId: "routing-result-001",
  researchReviewDecisionId: "review-decision-001",
  actionTarget: "activate_setup_revision",
  downstreamCommandType: "ActivateSetupDefinitionRevisionCommand",
  status: "received",
  attemptedBy: "execution-runtime",
  attemptedAt: "2026-07-27T12:00:00.000Z",
  warningCodes: [],
  createdAtUtc: "2026-07-27T12:00:00.000Z",
  updatedAtUtc: "2026-07-27T12:00:00.000Z"
});

test("execution-attempt audit repository stores, lists, and protects optimistic updates", async () => {
  const repository = new InMemoryExecutionAttemptAuditRepository();
  const audit = buildAudit();
  await repository.create({ audit, metadata });

  assert.deepEqual(await repository.getById(audit.attemptId), audit);
  assert.equal(
    (await repository.listByReviewDecisionRoutingResultId("routing-result-001")).length,
    1
  );
  assert.equal((await repository.listByStatus(["received"])).length, 1);

  await assert.rejects(
    () => repository.create({ audit, metadata }),
    (error: unknown) => error instanceof RepositoryError && error.code === "already_exists"
  );
  await assert.rejects(
    () =>
      repository.update({
        audit: { ...audit, status: "failed" },
        metadata,
        expectedVersion: 2
      }),
    (error: unknown) => error instanceof RepositoryError && error.code === "version_mismatch"
  );
});

test("execution-attempt audit service records a received attempt and one terminal outcome", async () => {
  const repository = new InMemoryExecutionAttemptAuditRepository();
  const service = createExecutionAttemptAuditService({
    executionAttemptAuditRepository: repository
  });
  const audit = buildAudit();

  await service.recordReceivedAttempt({ audit, metadata });
  const completed = await service.recordTerminalOutcome({
    attemptId: audit.attemptId,
    status: "executed",
    completedAt: "2026-07-27T12:00:05.000Z",
    outcomeCode: "setup_revision_activated",
    outcomeSummary: "Activated the requested setup revision.",
    warningCodes: [],
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-07-27T12:00:05.000Z"
    },
    expectedVersion: 1
  });

  assert.equal(completed?.status, "executed");
  assert.equal(completed?.outcomeCode, "setup_revision_activated");
  assert.equal(completed?.updatedAtUtc, "2026-07-27T12:00:05.000Z");
  assert.equal((await repository.listByStatus(["executed"])).length, 1);

  await assert.rejects(
    () =>
      service.recordTerminalOutcome({
        attemptId: audit.attemptId,
        status: "failed",
        completedAt: "2026-07-27T12:00:10.000Z",
        outcomeCode: "unexpected_failure",
        warningCodes: [],
        metadata,
        expectedVersion: 2
      }),
    (error: unknown) => error instanceof ExecutionAttemptAuditValidationError
  );
});

test("execution-attempt audit service rejects invalid received and terminal evidence", async () => {
  const service = createExecutionAttemptAuditService({
    executionAttemptAuditRepository: new InMemoryExecutionAttemptAuditRepository()
  });

  await assert.rejects(
    () =>
      service.recordReceivedAttempt({
        audit: { ...buildAudit(), status: "failed" },
        metadata
      }),
    (error: unknown) => error instanceof ExecutionAttemptAuditValidationError
  );

  await assert.rejects(
    () =>
      service.recordReceivedAttempt({
        audit: { ...buildAudit(), attemptedAt: "not-a-timestamp" },
        metadata
      }),
    (error: unknown) => error instanceof ExecutionAttemptAuditValidationError
  );

  await service.recordReceivedAttempt({ audit: buildAudit(), metadata });
  await assert.rejects(
    () =>
      service.recordTerminalOutcome({
        attemptId: "execution-attempt-001",
        status: "rejected",
        completedAt: "2026-07-27T11:59:59.000Z",
        outcomeCode: "validation_rejected",
        warningCodes: [],
        metadata,
        expectedVersion: 1
      }),
    (error: unknown) => error instanceof ExecutionAttemptAuditValidationError
  );
});
