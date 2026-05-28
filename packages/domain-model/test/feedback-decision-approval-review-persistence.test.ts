import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFeedbackDecisionApprovalReviewPersistence,
  InMemoryResearchDecisionApprovalRepository,
  InMemoryResearchFeedbackDecisionRepository,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type ResearchFeedbackDecision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-feedback-approval-review-persistence",
  originTransitionId: "transition-feedback-approval-review-persistence",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-feedback-approval-review-persistence",
  sourceObservedAtUtc: "2026-05-28T10:00:00.000Z"
};

const buildFeedbackDecision = (
  id: string,
  status: ResearchFeedbackDecision["decisionStatus"] = "proposed"
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "Aggregate evidence supports keeping the setup active.",
  decisionStatus: status,
  requiresManualReview: true,
  evidenceSummary: "Feedback decision review coverage",
  createdAt: "2026-05-28T09:00:00.000Z",
  updatedAt: "2026-05-28T09:00:00.000Z"
});

const buildApproval = (id: string, researchFeedbackDecisionId: string): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId: "setup-001",
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-28T10:05:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved during atomic persistence test.",
  approvalStatus: "recorded",
  authorizedNextAction: "keep_active",
  createdAt: "2026-05-28T10:05:00.000Z",
  updatedAt: "2026-05-28T10:05:00.000Z"
});

class AlwaysFailingApprovalRepository extends InMemoryResearchDecisionApprovalRepository {
  override async create(_request: {
    approval: ResearchDecisionApproval;
    metadata: ProductRecordMetadata;
  }): Promise<ResearchDecisionApproval> {
    throw new Error("forced approval persistence failure");
  }
}

test("in-memory approval review persistence records decision update and approval together", async () => {
  const feedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const approvalRepository = new InMemoryResearchDecisionApprovalRepository();
  const persistence = new InMemoryFeedbackDecisionApprovalReviewPersistence(
    feedbackDecisionRepository,
    approvalRepository
  );

  await feedbackDecisionRepository.create({
    decision: buildFeedbackDecision("feedback-001"),
    metadata
  });

  const result = await persistence.recordFeedbackDecisionApproval({
    researchFeedbackDecisionId: "feedback-001",
    nextDecisionStatus: "accepted",
    reviewerMetadata: {
      reviewedBy: "reviewer-001",
      reviewedAt: "2026-05-28T10:05:00.000Z",
      approvalOutcome: "approved"
    },
    approval: buildApproval("approval-001", "feedback-001"),
    metadata
  });

  const storedDecision = await feedbackDecisionRepository.getById("feedback-001");
  const storedApprovals = await approvalRepository.listByFeedbackDecisionId("feedback-001");

  assert.equal(result.status, "recorded");
  if (result.status !== "recorded") {
    assert.fail("approval review persistence should have recorded the approval");
  }

  assert.equal(result.decision.decisionStatus, "accepted");
  assert.equal(result.approval.authorizedNextAction, "keep_active");
  assert.equal(storedDecision?.decisionStatus, "accepted");
  assert.equal(storedApprovals.length, 1);
});

test("in-memory approval review persistence rolls back the decision when approval insert fails", async () => {
  const feedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const approvalRepository = new AlwaysFailingApprovalRepository();
  const persistence = new InMemoryFeedbackDecisionApprovalReviewPersistence(
    feedbackDecisionRepository,
    approvalRepository
  );

  await feedbackDecisionRepository.create({
    decision: buildFeedbackDecision("feedback-002"),
    metadata
  });

  await assert.rejects(
    async () =>
      persistence.recordFeedbackDecisionApproval({
        researchFeedbackDecisionId: "feedback-002",
        nextDecisionStatus: "accepted",
        reviewerMetadata: {
          reviewedBy: "reviewer-001",
          reviewedAt: "2026-05-28T10:05:00.000Z",
          approvalOutcome: "approved"
        },
        approval: buildApproval("approval-002", "feedback-002"),
        metadata
      }),
    /forced approval persistence failure/
  );

  const storedDecision = await feedbackDecisionRepository.getById("feedback-002");
  const storedApprovals = await approvalRepository.listByFeedbackDecisionId("feedback-002");

  assert.equal(storedDecision?.decisionStatus, "proposed");
  assert.equal(storedDecision?.reviewerMetadata, undefined);
  assert.equal(storedApprovals.length, 0);
});

test("in-memory approval review persistence reports conflict for non-proposed decisions", async () => {
  const feedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const approvalRepository = new InMemoryResearchDecisionApprovalRepository();
  const persistence = new InMemoryFeedbackDecisionApprovalReviewPersistence(
    feedbackDecisionRepository,
    approvalRepository
  );

  await feedbackDecisionRepository.create({
    decision: buildFeedbackDecision("feedback-003", "accepted"),
    metadata
  });

  const result = await persistence.recordFeedbackDecisionApproval({
    researchFeedbackDecisionId: "feedback-003",
    nextDecisionStatus: "accepted",
    reviewerMetadata: {
      reviewedBy: "reviewer-001",
      reviewedAt: "2026-05-28T10:05:00.000Z",
      approvalOutcome: "approved"
    },
    approval: buildApproval("approval-003", "feedback-003"),
    metadata
  });

  assert.equal(result.status, "conflict");
  if (result.status !== "conflict") {
    assert.fail("approval review persistence should have returned a conflict");
  }

  assert.equal(result.currentDecision.decisionStatus, "accepted");
});
