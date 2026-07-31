import assert from "node:assert/strict";
import test from "node:test";

import type {
  ExecutePreparedRoutedActionRequest,
  ExecutionAttemptRuntimeResult,
  RoutedActionExecutionEnvelope,
} from "@monitor/domain-model";

import { createPreparedEnvelopeExecutionRuntime } from "../src/index.js";

const envelope: RoutedActionExecutionEnvelope = {
  id: "envelope-001",
  sourceRoutingResultId: "route-001",
  sourceReviewDecisionId: "decision-001",
  actionTarget: "activate_setup_revision",
  actionCommandType: "ActivateSetupDefinitionRevisionCommand",
  targetEntityRefs: { setupFamilyId: "family-001", setupRevisionId: "revision-001" },
  routeMetadataSnapshot: { routeStatus: "routed" },
  executionPayloadSnapshot: {
    commandType: "ActivateSetupDefinitionRevisionCommand",
    target: "activate_setup_revision",
    commandInput: {
      setupRevisionId: "revision-001",
      setupFamilyId: "family-001",
      sourceReviewDecisionId: "decision-001",
      sourceRoutingResultId: "route-001",
    },
  },
  executionStatus: "prepared",
  preparedBy: "reviewer",
  preparedAt: "2026-08-01T01:00:00.000Z",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z",
};

const request = {
  routedActionExecutionEnvelopeId: envelope.id,
  attemptId: "attempt-001",
  attemptedBy: "operator",
  attemptedAt: "2026-08-01T01:05:00.000Z",
};

test("builds an immutable audit for the prepared envelope", async () => {
  let received: ExecutePreparedRoutedActionRequest | undefined;
  const runtime = createPreparedEnvelopeExecutionRuntime({
    routedActionExecutionEnvelopeRepository: {
      async getById(): Promise<RoutedActionExecutionEnvelope> {
        return envelope;
      },
    },
    executionAttemptRuntime: {
      async execute(input): Promise<ExecutionAttemptRuntimeResult> {
        received = input;
        return { status: "executed", audit: input.audit };
      },
    },
  });

  const result = await runtime.execute(request);

  assert.equal(result.status, "executed");
  assert.deepEqual(received?.audit, {
    attemptId: request.attemptId,
    routedActionExecutionEnvelopeId: envelope.id,
    reviewDecisionRoutingResultId: envelope.sourceRoutingResultId,
    researchReviewDecisionId: envelope.sourceReviewDecisionId,
    actionTarget: envelope.actionTarget,
    downstreamCommandType: envelope.actionCommandType,
    status: "received",
    attemptedBy: request.attemptedBy,
    attemptedAt: request.attemptedAt,
    warningCodes: [],
    createdAtUtc: request.attemptedAt,
    updatedAtUtc: request.attemptedAt,
  });
  assert.equal(received?.metadata.traceId, envelope.id);
});

test("rejects malformed, missing, and non-prepared envelopes before execution", async () => {
  let executionCalls = 0;
  const missing = createPreparedEnvelopeExecutionRuntime({
    routedActionExecutionEnvelopeRepository: {
      async getById(): Promise<null> {
        return null;
      },
    },
    executionAttemptRuntime: {
      async execute(): Promise<never> {
        executionCalls += 1;
        throw new Error("execution should not be called");
      },
    },
  });
  const stale = createPreparedEnvelopeExecutionRuntime({
    routedActionExecutionEnvelopeRepository: {
      async getById(): Promise<RoutedActionExecutionEnvelope> {
        return { ...envelope, executionStatus: "cancelled" };
      },
    },
    executionAttemptRuntime: {
      async execute(): Promise<never> {
        executionCalls += 1;
        throw new Error("execution should not be called");
      },
    },
  });

  assert.equal((await missing.execute({ ...request, attemptId: "" })).status, "rejected_validation");
  assert.equal((await missing.execute(request)).status, "rejected_validation");
  assert.equal((await stale.execute(request)).status, "rejected_validation");
  assert.equal(executionCalls, 0);
});

test("preserves audited execution outcomes and maps runtime failures", async () => {
  const rejected = createPreparedEnvelopeExecutionRuntime({
    routedActionExecutionEnvelopeRepository: {
      async getById(): Promise<RoutedActionExecutionEnvelope> {
        return envelope;
      },
    },
    executionAttemptRuntime: {
      async execute(input): Promise<ExecutionAttemptRuntimeResult> {
        return { status: "rejected", audit: input.audit };
      },
    },
  });
  const failed = createPreparedEnvelopeExecutionRuntime({
    routedActionExecutionEnvelopeRepository: {
      async getById(): Promise<never> {
        throw new Error("temporary envelope lookup failure");
      },
    },
    executionAttemptRuntime: {
      async execute(): Promise<never> {
        throw new Error("execution should not be called");
      },
    },
  });

  assert.equal((await rejected.execute(request)).status, "rejected");

  const result = await failed.execute(request);

  assert.equal(result.status, "failed");
  assert.match("reason" in result ? result.reason : "", /temporary envelope lookup failure/);
});
