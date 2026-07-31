import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProductRecordMetadata,
  ResearchDecisionApproval,
  SetupRefinementRequestResult
} from "@monitor/domain-model";

import { createApprovedRefinementRuntime } from "../src/index.js";

const approval: ResearchDecisionApproval = {
  id: "approval-refinement-001",
  researchFeedbackDecisionId: "feedback-refinement-001",
  setupDefinitionId: "setup-refinement-001",
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-08-01T01:00:00.000Z",
  approvalOutcome: "approved",
  approvalStatus: "recorded",
  authorizedNextAction: "refine_definition",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z"
};

const request = {
  researchDecisionApprovalId: approval.id,
  requestedBy: "research_owner_1",
  requestedAt: "2026-08-01T01:05:00.000Z",
  refinementRationaleSummary: "Evidence indicates the setup needs revision.",
  requestedChangesSummary: "Review the breakout confirmation condition.",
  evidenceReferences: ["aggregate-refinement-001"]
};

test("builds an auditable refinement request only from an approved refine-definition action", async () => {
  let receivedCommand: Record<string, unknown> | undefined;
  let receivedMetadata: ProductRecordMetadata | undefined;
  const runtime = createApprovedRefinementRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedRefinementHandoff: {
      async create(command, metadata): Promise<SetupRefinementRequestResult> {
        receivedCommand = command;
        receivedMetadata = metadata;
        return {
          status: "created",
          setupRefinementRequestId: "refinement-001",
          researchDecisionApprovalId: approval.id,
          researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
          setupDefinitionId: approval.setupDefinitionId,
          approvedAction: "refine_definition",
          refinementStatus: "proposed",
          warnings: []
        };
      }
    }
  });

  const result = await runtime.createFromApprovedAction(request);

  assert.equal(result.status, "created");
  assert.deepEqual(receivedCommand, {
    researchDecisionApprovalId: approval.id,
    researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
    setupDefinitionId: approval.setupDefinitionId,
    approvedAction: "refine_definition",
    requestedBy: request.requestedBy,
    requestedAt: request.requestedAt,
    refinementRationaleSummary: request.refinementRationaleSummary,
    requestedChangesSummary: request.requestedChangesSummary,
    evidenceReferences: request.evidenceReferences
  });
  assert.equal(receivedMetadata?.traceId, approval.id);
  assert.equal(receivedMetadata?.createdBySource, "manual_curation");
});

test("rejects malformed, missing, and unauthorized approvals before the handoff", async () => {
  let calls = 0;
  const repository = { async getById(): Promise<ResearchDecisionApproval | null> { return null; } };
  const runtime = createApprovedRefinementRuntime({
    researchDecisionApprovalRepository: repository,
    approvedRefinementHandoff: { async create(): Promise<never> { calls += 1; throw new Error(); } }
  });
  const malformed = await runtime.createFromApprovedAction({ ...request, requestedBy: "" });
  const missing = await runtime.createFromApprovedAction(request);

  const unauthorizedRuntime = createApprovedRefinementRuntime({
    researchDecisionApprovalRepository: {
      async getById(): Promise<ResearchDecisionApproval> {
        return { ...approval, authorizedNextAction: "pause_setup" };
      }
    },
    approvedRefinementHandoff: { async create(): Promise<never> { calls += 1; throw new Error(); } }
  });
  const unauthorized = await unauthorizedRuntime.createFromApprovedAction(request);

  assert.equal(malformed.status, "rejected_validation");
  assert.equal(missing.status, "rejected_validation");
  assert.match(missing.reason ?? "", /research_decision_approval not found/);
  assert.equal(unauthorized.status, "rejected_lifecycle");
  assert.equal(calls, 0);
});

test("preserves handoff outcomes and maps unexpected failures to retryable results", async () => {
  const rejectedRuntime = createApprovedRefinementRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedRefinementHandoff: {
      async create(): Promise<SetupRefinementRequestResult> {
        return { status: "rejected_validation", reason: "handoff rejected", warnings: [] };
      }
    }
  });
  const failingRuntime = createApprovedRefinementRuntime({
    researchDecisionApprovalRepository: { async getById(): Promise<ResearchDecisionApproval> { return approval; } },
    approvedRefinementHandoff: { async create(): Promise<never> { throw new Error("temporary failure"); } }
  });

  const rejected = await rejectedRuntime.createFromApprovedAction(request);
  const failed = await failingRuntime.createFromApprovedAction(request);

  assert.equal(rejected.status, "rejected_validation");
  assert.equal(failed.status, "failed");
  assert.match(failed.reason ?? "", /temporary failure/);
  assert.equal(failed.warnings.length, 1);
});
