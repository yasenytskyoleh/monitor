import assert from "node:assert/strict";
import test from "node:test";

import type {
  ApplyApprovedSetupMutationCommand,
  ProductRecordMetadata,
  ResearchDecisionApproval,
  RoutedActionExecutionEnvelope,
  SetupLifecycleMutationResult
} from "@monitor/domain-model";

import { createLifecycleEnvelopeExecutor } from "../src/index.js";

const envelope: RoutedActionExecutionEnvelope = {
  id: "envelope-001",
  sourceRoutingResultId: "route-001",
  sourceReviewDecisionId: "decision-001",
  actionTarget: "apply_setup_lifecycle_mutation",
  actionCommandType: "ApplyApprovedSetupMutationCommand",
  targetEntityRefs: {
    setupFamilyId: "family-001",
    setupDefinitionId: "setup-001",
    researchFeedbackDecisionId: "feedback-001",
    researchDecisionApprovalId: "approval-001"
  },
  routeMetadataSnapshot: { routeStatus: "routed" },
  executionPayloadSnapshot: {
    commandType: "ApplyApprovedSetupMutationCommand",
    target: "apply_setup_lifecycle_mutation",
    commandInput: {
      setupDefinitionId: "setup-001",
      setupFamilyId: "family-001",
      sourceReviewDecisionId: "decision-001",
      sourceRoutingResultId: "route-001"
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
  authorizedNextAction: "pause_setup",
  createdAt: "2026-08-01T00:55:00.000Z",
  updatedAt: "2026-08-01T00:55:00.000Z"
};

test("executes a prepared lifecycle envelope through its persisted approval", async () => {
  let command: ApplyApprovedSetupMutationCommand | undefined;
  let metadata: ProductRecordMetadata | undefined;
  const executor = createLifecycleEnvelopeExecutor({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    setupLifecycleMutationHandoff: {
      async apply(input, inputMetadata): Promise<SetupLifecycleMutationResult> {
        command = input;
        metadata = inputMetadata;
        return { status: "applied", setupLifecycleMutationRecordId: "mutation-001", warnings: [] };
      }
    },
    mutatedBy: "lifecycle-executor",
    now: () => "2026-08-01T01:05:00.000Z"
  });

  const outcome = await executor.execute(envelope);

  assert.deepEqual(outcome, { status: "executed", outcomeCode: "setup_lifecycle_applied" });
  assert.equal(command?.researchDecisionApprovalId, approval.id);
  assert.equal(command?.researchFeedbackDecisionId, approval.researchFeedbackDecisionId);
  assert.equal(command?.approvedAction, "pause_setup");
  assert.equal(command?.mutatedBy, "lifecycle-executor");
  assert.equal(metadata?.traceId, envelope.id);
});

test("rejects malformed and unauthorized lifecycle envelopes without mutating", async () => {
  let mutations = 0;
  const executor = createLifecycleEnvelopeExecutor({
    researchDecisionApprovalRepository: {
      async getById(): Promise<ResearchDecisionApproval> {
        return { ...approval, authorizedNextAction: "refine_definition" };
      }
    },
    setupLifecycleMutationHandoff: {
      async apply(): Promise<never> {
        mutations += 1;
        throw new Error("should not mutate");
      }
    },
    mutatedBy: "lifecycle-executor",
    now: () => "2026-08-01T01:05:00.000Z"
  });

  assert.deepEqual(
    await executor.execute({ ...envelope, executionStatus: "cancelled" }),
    { status: "rejected", outcomeCode: "invalid_lifecycle_envelope" }
  );
  assert.deepEqual(
    await executor.execute(envelope),
    { status: "rejected", outcomeCode: "setup_lifecycle_action_not_authorized" }
  );
  assert.equal(mutations, 0);
});

test("rejects lifecycle payloads that do not match immutable envelope references", async () => {
  let mutations = 0;
  const executor = createLifecycleEnvelopeExecutor({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    setupLifecycleMutationHandoff: {
      async apply(): Promise<never> {
        mutations += 1;
        throw new Error("should not mutate");
      }
    },
    mutatedBy: "lifecycle-executor",
    now: () => "2026-08-01T01:05:00.000Z"
  });

  const outcome = await executor.execute({
    ...envelope,
    executionPayloadSnapshot: {
      commandType: "ApplyApprovedSetupMutationCommand",
      target: "apply_setup_lifecycle_mutation",
      commandInput: {
        setupDefinitionId: "setup-002",
        setupFamilyId: "family-001",
        sourceReviewDecisionId: "decision-001",
        sourceRoutingResultId: "route-001"
      }
    }
  });

  assert.deepEqual(outcome, { status: "rejected", outcomeCode: "invalid_lifecycle_envelope" });
  assert.equal(mutations, 0);
});

test("rejects malformed lifecycle command inputs without mutating", async () => {
  let mutations = 0;
  const executor = createLifecycleEnvelopeExecutor({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    setupLifecycleMutationHandoff: {
      async apply(): Promise<never> {
        mutations += 1;
        throw new Error("should not mutate");
      }
    },
    mutatedBy: "lifecycle-executor",
    now: () => "2026-08-01T01:05:00.000Z"
  });
  const malformedInputs = [null, "not-an-object", {}];

  for (const commandInput of malformedInputs) {
    const executionPayloadSnapshot = {
      commandType: "ApplyApprovedSetupMutationCommand",
      target: "apply_setup_lifecycle_mutation",
      commandInput
    } as unknown as RoutedActionExecutionEnvelope["executionPayloadSnapshot"];

    assert.deepEqual(
      await executor.execute({ ...envelope, executionPayloadSnapshot }),
      { status: "rejected", outcomeCode: "invalid_lifecycle_envelope" }
    );
  }

  assert.equal(mutations, 0);
});
