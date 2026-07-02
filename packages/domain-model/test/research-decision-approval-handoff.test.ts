import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryFeedbackDecisionApprovalReviewPersistence,
  InMemoryResearchDecisionApprovalRepository,
  InMemoryResearchFeedbackDecisionRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupDefinitionRepository,
  createResearchDecisionApprovalHandoff,
  createResearchService,
  type ProductRecordMetadata,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-research-decision-approval",
  originTransitionId: "transition-research-decision-approval",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-research-decision-approval",
  sourceObservedAtUtc: "2026-04-24T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Research approval setup",
  description: "Setup for research decision approval handoff tests",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-24T10:00:00.000Z",
  updatedAt: "2026-04-24T10:00:00.000Z"
});

const buildHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
  id,
  title: "Research approval hypothesis",
  description: "Feedback decisions should be manually approved before lifecycle mutation.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["approval must remain explicit and separate from recommendation"],
  notes: [],
  evidenceStatus: "weakens",
  status: "active",
  createdAt: "2026-04-24T10:00:00.000Z",
  updatedAt: "2026-04-24T10:00:00.000Z"
});

const buildFeedbackDecision = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string,
  recommendedAction: ResearchFeedbackDecision["recommendedAction"] = "pause_setup"
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  setupAggregateResultId: "aggregate-feedback-approval-001",
  evidenceStatus: "weakens",
  recommendedAction,
  rationaleSummary: "Evidence weakens hypothesis; recommendation requires manual review.",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "aggregate evidence weakened expected setup behavior",
  createdAt: "2026-04-24T11:00:00.000Z",
  updatedAt: "2026-04-24T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const researchFeedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const researchDecisionApprovalRepository = new InMemoryResearchDecisionApprovalRepository();
  const feedbackDecisionApprovalReviewPersistence =
    new InMemoryFeedbackDecisionApprovalReviewPersistence(
      researchFeedbackDecisionRepository,
      researchDecisionApprovalRepository
    );

  const researchService = createResearchService({
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository,
    feedbackDecisionApprovalReviewPersistence
  });

  const approvalHandoff = createResearchDecisionApprovalHandoff({
    researchService,
    setupDefinitionRepository,
    researchFeedbackDecisionRepository
  });

  return {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository,
    approvalHandoff
  };
};

test("valid approval command shape", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository,
    approvalHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-approval-001"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-approval-001", "setup-approval-001"),
    metadata
  });
  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-approval-001",
      "setup-approval-001",
      "hypothesis-approval-001",
      "pause_setup"
    ),
    metadata
  });

  const result = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-001",
      setupDefinitionId: "setup-approval-001",
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "approved",
      reviewerNotes: "Pause recommendation accepted pending next cycle review"
    },
    metadata
  );

  assert.equal(result.status, "recorded");
  assert.equal(result.approvalOutcome, "approved");
  assert.equal(result.decisionStatus, "accepted");
  assert.equal(result.authorizedNextAction, "pause_setup");

  const approvals = await researchDecisionApprovalRepository.listByFeedbackDecisionId(
    "feedback-approval-001"
  );
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0]?.authorizedNextAction, "pause_setup");
});

test("missing feedback decision rejected", async () => {
  const { setupDefinitionRepository, approvalHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-approval-002"),
    metadata
  });

  const result = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-missing",
      setupDefinitionId: "setup-approval-002",
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "approved"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("research_feedback_decision not found"), true);
});

test("missing reviewer rejected", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    approvalHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-approval-003"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-approval-003", "setup-approval-003"),
    metadata
  });
  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-approval-003",
      "setup-approval-003",
      "hypothesis-approval-003"
    ),
    metadata
  });

  const result = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-003",
      setupDefinitionId: "setup-approval-003",
      reviewedBy: "",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "approved"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("reviewedBy is required"), true);
});

test("invalid approval outcome rejected", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    approvalHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-approval-004"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-approval-004", "setup-approval-004"),
    metadata
  });
  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-approval-004",
      "setup-approval-004",
      "hypothesis-approval-004"
    ),
    metadata
  });

  const result = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-004",
      setupDefinitionId: "setup-approval-004",
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "invalid_outcome" as never
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("invalid decisionOutcome"), true);
});

test("approval result shape stays explicit", async () => {
  const { approvalHandoff } = createFixture();

  const result = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "",
      setupDefinitionId: "setup-approval-005",
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "approved"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});

test("rejected vs needs_changes outcome stays explicit", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    approvalHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-approval-006"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-approval-006", "setup-approval-006"),
    metadata
  });

  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-approval-006-rejected",
      "setup-approval-006",
      "hypothesis-approval-006",
      "archive_setup"
    ),
    metadata
  });
  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-approval-006-needs-changes",
      "setup-approval-006",
      "hypothesis-approval-006",
      "refine_definition"
    ),
    metadata
  });

  const rejected = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-006-rejected",
      setupDefinitionId: "setup-approval-006",
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "rejected"
    },
    metadata
  );

  const needsChanges = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-006-needs-changes",
      setupDefinitionId: "setup-approval-006",
      reviewedBy: "research_reviewer_2",
      reviewedAt: "2026-04-24T12:06:00.000Z",
      decisionOutcome: "needs_changes"
    },
    metadata
  );

  assert.equal(rejected.status, "recorded");
  assert.equal(rejected.approvalOutcome, "rejected");
  assert.equal(rejected.decisionStatus, "rejected");
  assert.equal(rejected.authorizedNextAction, undefined);

  assert.equal(needsChanges.status, "recorded");
  assert.equal(needsChanges.approvalOutcome, "needs_changes");
  assert.equal(needsChanges.decisionStatus, "reviewed");
  assert.equal(needsChanges.authorizedNextAction, undefined);
});

test("second approval attempt is rejected after the first review changes decision lifecycle", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository,
    approvalHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-approval-007"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-approval-007", "setup-approval-007"),
    metadata
  });
  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-approval-007",
      "setup-approval-007",
      "hypothesis-approval-007",
      "keep_active"
    ),
    metadata
  });

  const firstReview = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-007",
      setupDefinitionId: "setup-approval-007",
      reviewedBy: "research_reviewer_1",
      reviewedAt: "2026-04-24T12:05:00.000Z",
      decisionOutcome: "approved"
    },
    metadata
  );
  const secondReview = await approvalHandoff.review(
    {
      researchFeedbackDecisionId: "feedback-approval-007",
      setupDefinitionId: "setup-approval-007",
      reviewedBy: "research_reviewer_2",
      reviewedAt: "2026-04-24T12:06:00.000Z",
      decisionOutcome: "approved"
    },
    metadata
  );

  const approvals = await researchDecisionApprovalRepository.listByFeedbackDecisionId(
    "feedback-approval-007"
  );

  assert.equal(firstReview.status, "recorded");
  assert.equal(secondReview.status, "rejected_lifecycle");
  assert.equal(secondReview.reason?.includes("not eligible for manual approval"), true);
  assert.equal(approvals.length, 1);
});
