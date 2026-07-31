import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProductRecordMetadata,
  ResearchDecisionApproval,
  SetupLifecycleMutationResult
} from "@monitor/domain-model";

import { createApprovedSetupLifecycleRuntime } from "../src/index.js";

const approval: ResearchDecisionApproval = {
  id: "approval-lifecycle-001",
  researchFeedbackDecisionId: "feedback-lifecycle-001",
  setupDefinitionId: "setup-lifecycle-001",
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-08-01T01:00:00.000Z",
  approvalOutcome: "approved",
  approvalStatus: "recorded",
  authorizedNextAction: "pause_setup",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z"
};

const request = {
  researchDecisionApprovalId: approval.id,
  mutatedBy: "setup_owner_1",
  mutatedAt: "2026-08-01T01:05:00.000Z",
  approvedAction: "pause_setup" as const,
  notes: "Pause after explicit approval."
};

test("applies only the lifecycle action explicitly authorized by an approval", async () => {
  let receivedCommand: Record<string, unknown> | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const runtime = createApprovedSetupLifecycleRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedSetupLifecycleHandoff: {
      async apply(command, metadata): Promise<SetupLifecycleMutationResult> {
        receivedCommand = command;
        receivedMetadata = metadata;
        return {
          status: "applied",
          setupLifecycleMutationRecordId: "mutation-001",
          researchDecisionApprovalId: approval.id,
          researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
          setupDefinitionId: approval.setupDefinitionId,
          approvedAction: "pause_setup",
          previousStatus: "active",
          newStatus: "paused",
          warnings: []
        };
      }
    }
  });

  const result = await runtime.applyFromApprovedAction(request);

  assert.equal(result.status, "applied");
  assert.deepEqual(receivedCommand, {
    researchDecisionApprovalId: approval.id,
    researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
    setupDefinitionId: approval.setupDefinitionId,
    approvedAction: "pause_setup",
    mutatedBy: request.mutatedBy,
    mutatedAt: request.mutatedAt,
    notes: request.notes
  });
  assert.equal(receivedMetadata?.traceId, approval.id);
});

test("rejects malformed, missing, and unauthorized lifecycle mutation requests", async () => {
  let calls = 0;
  const missingRuntime = createApprovedSetupLifecycleRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<null> { return null; } },
    approvedSetupLifecycleHandoff: { async apply(): Promise<never> { calls += 1; throw new Error(); } }
  });
  const malformed = await missingRuntime.applyFromApprovedAction({ ...request, mutatedBy: "" });
  const missing = await missingRuntime.applyFromApprovedAction(request);
  const mismatchRuntime = createApprovedSetupLifecycleRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedSetupLifecycleHandoff: { async apply(): Promise<never> { calls += 1; throw new Error(); } }
  });
  const mismatch = await mismatchRuntime.applyFromApprovedAction({ ...request, approvedAction: "archive_setup" });

  assert.equal(malformed.status, "rejected_validation");
  assert.equal(missing.status, "rejected_validation");
  assert.match(missing.reason ?? "", /research_decision_approval not found/);
  assert.equal(mismatch.status, "rejected_lifecycle");
  assert.equal(calls, 0);
});

test("preserves handoff rejection and maps unexpected failures to retryable results", async () => {
  const rejectedRuntime = createApprovedSetupLifecycleRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedSetupLifecycleHandoff: {
      async apply(): Promise<SetupLifecycleMutationResult> {
        return { status: "rejected_validation", reason: "handoff rejected", warnings: [] };
      }
    }
  });
  const failingRuntime = createApprovedSetupLifecycleRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedSetupLifecycleHandoff: { async apply(): Promise<never> { throw new Error("temporary mutation failure"); } }
  });

  const rejected = await rejectedRuntime.applyFromApprovedAction(request);
  const failed = await failingRuntime.applyFromApprovedAction(request);

  assert.equal(rejected.status, "rejected_validation");
  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary mutation failure/);
  assert.equal(failed.warnings.length, 1);
});
