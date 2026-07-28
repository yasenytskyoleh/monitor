import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionAttemptAuditService,
  InMemoryExecutionAttemptAuditRelationalRepositoryAdapter,
  RelationalExecutionAttemptAuditRepository,
  RepositoryError,
  type ExecutionAttemptAudit,
  type ProductRecordMetadata
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-execution-audit-relational-001",
  originTransitionId: "transition-execution-audit-relational-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-execution-audit-relational-001",
  sourceObservedAtUtc: "2026-07-27T12:00:00.000Z"
};

const buildAudit = (): ExecutionAttemptAudit => ({
  attemptId: "execution-attempt-relational-001",
  reviewDecisionRoutingResultId: "routing-result-001",
  actionTarget: "activate_setup_revision",
  downstreamCommandType: "ActivateSetupDefinitionRevisionCommand",
  status: "received",
  attemptedBy: "execution-runtime",
  attemptedAt: "2026-07-27T12:00:00.000Z",
  warningCodes: [],
  createdAtUtc: "2026-07-27T12:00:00.000Z",
  updatedAtUtc: "2026-07-27T12:00:00.000Z"
});

test("execution-attempt audit relational repository round-trips optional correlation and terminal evidence", async () => {
  const repository = new RelationalExecutionAttemptAuditRepository(
    new InMemoryExecutionAttemptAuditRelationalRepositoryAdapter()
  );
  const audit = buildAudit();
  await repository.create({ audit, metadata });

  const completed: ExecutionAttemptAudit = {
    ...audit,
    status: "failed",
    completedAt: "2026-07-27T12:00:05.000Z",
    outcomeCode: "provider_unavailable",
    warningCodes: ["retry_not_scheduled"],
    updatedAtUtc: "2026-07-27T12:00:05.000Z"
  };
  const updated = await repository.update({
    audit: completed,
    metadata: { ...metadata, sourceObservedAtUtc: completed.updatedAtUtc },
    expectedVersion: 1
  });

  assert.deepEqual(updated, completed);
  assert.equal((await repository.listByReviewDecisionRoutingResultId("routing-result-001")).length, 1);
  assert.equal((await repository.listByStatus(["failed"])).length, 1);
});

test("relational execution-attempt audit repository permits one audit per prepared envelope", async () => {
  const repository = new RelationalExecutionAttemptAuditRepository(
    new InMemoryExecutionAttemptAuditRelationalRepositoryAdapter()
  );
  const audit = { ...buildAudit(), routedActionExecutionEnvelopeId: "execution-envelope-001" };
  await repository.create({ audit, metadata });

  await assert.rejects(
    () =>
      repository.create({
        audit: { ...audit, attemptId: "execution-attempt-relational-002" },
        metadata
      }),
    (error: unknown) => error instanceof RepositoryError && error.code === "already_exists"
  );
});

test("execution-attempt audit terminalization uses a version check when callers omit one", async () => {
  const repository = new RelationalExecutionAttemptAuditRepository(
    new InMemoryExecutionAttemptAuditRelationalRepositoryAdapter()
  );
  const service = createExecutionAttemptAuditService({ executionAttemptAuditRepository: repository });
  const audit = buildAudit();
  await service.recordReceivedAttempt({ audit, metadata });

  const outcomes = await Promise.allSettled([
    service.recordTerminalOutcome({
      attemptId: audit.attemptId,
      status: "executed",
      completedAt: "2026-07-27T12:00:05.000Z",
      outcomeCode: "setup_revision_activated",
      warningCodes: [],
      metadata,
      expectedVersion: null
    }),
    service.recordTerminalOutcome({
      attemptId: audit.attemptId,
      status: "failed",
      completedAt: "2026-07-27T12:00:06.000Z",
      outcomeCode: "provider_unavailable",
      warningCodes: [],
      metadata,
      expectedVersion: null
    })
  ]);

  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 1);
});
