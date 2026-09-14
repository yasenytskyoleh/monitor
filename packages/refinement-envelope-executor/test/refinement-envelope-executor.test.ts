import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreateSetupRefinementRequestCommand,
  ProductRecordMetadata,
  ResearchDecisionApproval,
  RoutedActionExecutionEnvelope,
  SetupRefinementRequestResult
} from "@monitor/domain-model";

import { createRefinementEnvelopeExecutor } from "../src/index.js";

const envelope: RoutedActionExecutionEnvelope = {
  id: "envelope-001",
  sourceRoutingResultId: "route-001",
  sourceReviewDecisionId: "decision-001",
  actionTarget: "create_setup_refinement_request",
  actionCommandType: "CreateSetupRefinementRequestCommand",
  targetEntityRefs: {
    setupFamilyId: "family-001",
    setupDefinitionId: "setup-001",
    researchFeedbackDecisionId: "feedback-001",
    researchDecisionApprovalId: "approval-001"
  },
  routeMetadataSnapshot: { routeStatus: "routed" },
  executionPayloadSnapshot: {
    commandType: "CreateSetupRefinementRequestCommand",
    target: "create_setup_refinement_request",
    commandInput: {
      setupDefinitionId: "setup-001",
      setupFamilyId: "family-001",
      sourceReviewDecisionId: "decision-001",
      sourceRoutingResultId: "route-001",
      requestedBy: "reviewer",
      requestedAt: "2026-08-01T01:05:00.000Z",
      refinementRationaleSummary: "Evidence indicates the setup needs revision.",
      requestedChangesSummary: "Review the breakout confirmation condition.",
      evidenceReferences: ["evidence-001"]
    }
  },
  executionStatus: "prepared",
  preparedBy: "reviewer",
  preparedAt: "2026-08-01T01:00:00.000Z",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z"
};

const approval: ResearchDecisionApproval = {
  id: "approval-001",
  researchFeedbackDecisionId: "feedback-001",
  setupDefinitionId: "setup-001",
  reviewedBy: "reviewer",
  reviewedAt: "2026-08-01T00:55:00.000Z",
  approvalOutcome: "approved",
  approvalStatus: "recorded",
  authorizedNextAction: "refine_definition",
  createdAt: "2026-08-01T00:55:00.000Z",
  updatedAt: "2026-08-01T00:55:00.000Z"
};

test("creates a refinement request from an immutable prepared envelope", async () => {
  let command: CreateSetupRefinementRequestCommand | undefined;
  let metadata: ProductRecordMetadata | undefined;
  const executor = createRefinementEnvelopeExecutor({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    setupRefinementHandoff: {
      async create(input, inputMetadata): Promise<SetupRefinementRequestResult> {
        command = input;
        metadata = inputMetadata;
        return { status: "created", setupRefinementRequestId: "refinement-001", warnings: [] };
      }
    }
  });

  const outcome = await executor.execute(envelope);

  assert.deepEqual(outcome, { status: "executed", outcomeCode: "setup_refinement_created" });
  assert.deepEqual(command, {
    researchDecisionApprovalId: approval.id,
    researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
    setupDefinitionId: approval.setupDefinitionId,
    approvedAction: "refine_definition",
    requestedBy: "reviewer",
    requestedAt: "2026-08-01T01:05:00.000Z",
    refinementRationaleSummary: "Evidence indicates the setup needs revision.",
    requestedChangesSummary: "Review the breakout confirmation condition.",
    evidenceReferences: ["evidence-001"]
  });
  assert.deepEqual(metadata, {
    originRunId: null,
    originTransitionId: null,
    createdBySource: "manual_curation",
    lastUpdatedBySource: "manual_curation",
    traceId: envelope.id,
    sourceObservedAtUtc: "2026-08-01T01:05:00.000Z",
    notes: "refinement envelope execution: envelope=envelope-001"
  });
});

test("rejects malformed and unauthorized refinement envelopes without creating a request", async () => {
  let creations = 0;
  const executor = createRefinementEnvelopeExecutor({
    researchDecisionApprovalRepository: {
      async getById(): Promise<ResearchDecisionApproval> {
        return { ...approval, authorizedNextAction: "pause_setup" };
      }
    },
    setupRefinementHandoff: {
      async create(): Promise<never> {
        creations += 1;
        throw new Error("should not create");
      }
    }
  });

  assert.deepEqual(
    await executor.execute({ ...envelope, executionStatus: "cancelled" }),
    { status: "rejected", outcomeCode: "invalid_refinement_envelope" }
  );
  assert.deepEqual(
    await executor.execute(envelope),
    { status: "rejected", outcomeCode: "setup_refinement_action_not_authorized" }
  );
  assert.equal(creations, 0);
});

test("rejects malformed refinement command inputs without creating a request", async () => {
  let creations = 0;
  const executor = createRefinementEnvelopeExecutor({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    setupRefinementHandoff: {
      async create(): Promise<never> {
        creations += 1;
        throw new Error("should not create");
      }
    }
  });
  const malformedInputs = [null, "not-an-object", {}];

  for (const commandInput of malformedInputs) {
    const executionPayloadSnapshot = {
      commandType: "CreateSetupRefinementRequestCommand",
      target: "create_setup_refinement_request",
      commandInput
    } as unknown as RoutedActionExecutionEnvelope["executionPayloadSnapshot"];

    assert.deepEqual(
      await executor.execute({ ...envelope, executionPayloadSnapshot }),
      { status: "rejected", outcomeCode: "invalid_refinement_envelope" }
    );
  }

  assert.equal(creations, 0);
});

test("rejects malformed durable snapshots and target references without creating a request", async () => {
  let creations = 0;
  const executor = createRefinementEnvelopeExecutor({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    setupRefinementHandoff: {
      async create(): Promise<never> {
        creations += 1;
        throw new Error("should not create");
      }
    }
  });
  const malformedEnvelopes = [
    { ...envelope, targetEntityRefs: null },
    { ...envelope, targetEntityRefs: { ...envelope.targetEntityRefs, researchDecisionApprovalId: 1 } },
    { ...envelope, executionPayloadSnapshot: null }
  ] as unknown as RoutedActionExecutionEnvelope[];

  for (const malformedEnvelope of malformedEnvelopes) {
    assert.deepEqual(
      await executor.execute(malformedEnvelope),
      { status: "rejected", outcomeCode: "invalid_refinement_envelope" }
    );
  }

  assert.equal(creations, 0);
});
