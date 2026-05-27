import assert from "node:assert/strict";
import test from "node:test";

import {
  composeResearchDecisionApprovalRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemoryResearchDecisionApprovalRelationalRepositoryAdapter,
  InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter,
  InMemorySetupAggregateRelationalRepositoryAdapter,
  RelationalResearchDecisionApprovalRepository,
  RelationalResearchFeedbackDecisionRepository,
  RelationalResearchHypothesisRepository,
  RelationalSetupAggregateResultRepository,
  RelationalSetupDefinitionRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-approval-001",
  originTransitionId: "transition-approval-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-approval-001",
  sourceObservedAtUtc: "2026-05-27T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-27T10:00:00.000Z",
  updatedAt: "2026-05-27T11:00:00.000Z"
});

const buildResearchHypothesis = (
  id: string,
  setupDefinitionId: string
): ResearchHypothesis => ({
  id,
  title: "Breakout retests outperform random entries",
  description: "Structured breakout retests should show positive asymmetry.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["median MFE exceeds median MAE over 50 samples"],
  notes: [],
  status: "active",
  evidenceStatus: "supports",
  evidenceSummary: "aggregate evidence is positive",
  lastEvidenceAggregateResultId: "aggregate-001",
  lastEvidenceAssessedAt: "2026-05-27T11:30:00.000Z",
  createdAt: "2026-05-27T10:00:00.000Z",
  updatedAt: "2026-05-27T11:30:00.000Z"
});

const buildAggregate = (id: string, setupDefinitionId: string): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId: "hypothesis-001",
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "symbol_set",
      symbolIds: ["BTC-USDT", "ETH-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-approval-001",
    hypothesisId: "hypothesis-001"
  },
  status: "completed",
  totalCandidates: 10,
  completedEvaluations: 8,
  invalidatedEvaluations: 2,
  averagePercentageMove: 1.42,
  averageAbsoluteMove: 115,
  averageFinalOutcome: 0.25,
  averageMaxFavorableExcursion: 2.1,
  averageMaxAdverseExcursion: -1.1,
  positiveOutcomeCount: 5,
  computedAt: "2026-05-27T11:30:00.000Z",
  createdAt: "2026-05-27T11:00:00.000Z",
  updatedAt: "2026-05-27T11:30:00.000Z"
});

const buildDecision = (id: string): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "aggregate evidence supports keeping the setup active",
  decisionStatus: "accepted",
  requiresManualReview: true,
  evidenceSummary: "10 completed evaluations with positive asymmetry",
  reviewerMetadata: {
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-05-27T12:00:00.000Z",
    approvalOutcome: "approved"
  },
  createdAt: "2026-05-27T12:00:00.000Z",
  updatedAt: "2026-05-27T12:00:00.000Z"
});

const buildApproval = (
  id: string,
  researchFeedbackDecisionId = "feedback-001",
  setupDefinitionId = "setup-001"
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-05-27T12:05:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved after manual review.",
  approvalStatus: "recorded",
  authorizedNextAction: "keep_active",
  createdAt: "2026-05-27T12:05:00.000Z",
  updatedAt: "2026-05-27T12:05:00.000Z"
});

const createRepositoryFixture = async () => {
  const firstDurableAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupDefinitionRepository = new RelationalSetupDefinitionRepository(firstDurableAdapter);
  const researchHypothesisRepository = new RelationalResearchHypothesisRepository(firstDurableAdapter);

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
    metadata
  });

  const aggregateAdapter = new InMemorySetupAggregateRelationalRepositoryAdapter(firstDurableAdapter);
  const aggregateRepository = new RelationalSetupAggregateResultRepository(aggregateAdapter);
  await aggregateRepository.create({
    aggregate: buildAggregate("aggregate-001", "setup-001"),
    metadata
  });

  const feedbackAdapter = new InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
    loadResearchHypothesisBundle: firstDurableAdapter.loadResearchHypothesisBundle.bind(firstDurableAdapter),
    loadSetupAggregateResultRecord:
      aggregateAdapter.loadSetupAggregateResultRecord.bind(aggregateAdapter)
  });
  const feedbackRepository = new RelationalResearchFeedbackDecisionRepository(feedbackAdapter);

  await feedbackRepository.create({
    decision: buildDecision("feedback-001"),
    metadata
  });

  const approvalAdapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
    loadResearchFeedbackDecisionRecord:
      feedbackAdapter.loadResearchFeedbackDecisionRecord.bind(feedbackAdapter),
    loadSetupDefinitionRecord: firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter)
  });

  return {
    setupDefinitionRepository,
    approvalRepository: new RelationalResearchDecisionApprovalRepository(approvalAdapter),
    composedRepositories: composeResearchDecisionApprovalRelationalRepositories(approvalAdapter)
  };
};

test("relational approval repository persists and lists approvals through the adapter boundary", async () => {
  const { approvalRepository } = await createRepositoryFixture();

  const created = await approvalRepository.create({
    approval: buildApproval("approval-001"),
    metadata
  });
  const byId = await approvalRepository.getById("approval-001");
  const byFeedbackDecision = await approvalRepository.listByFeedbackDecisionId("feedback-001");

  assert.equal(created.approvalOutcome, "approved");
  assert.equal(byId?.authorizedNextAction, "keep_active");
  assert.equal(byFeedbackDecision.length, 1);
  assert.equal(byFeedbackDecision[0]?.researchFeedbackDecisionId, "feedback-001");
});

test("approval repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = await createRepositoryFixture();

  await composedRepositories.researchDecisionApprovalRepository.create({
    approval: buildApproval("approval-002"),
    metadata
  });

  const stored = await composedRepositories.researchDecisionApprovalRepository.getById(
    "approval-002"
  );

  assert.equal(stored?.approvalStatus, "recorded");
  assert.equal(stored?.reviewedBy, "reviewer-001");
});

test("relational approval repository rejects feedback decisions linked to a different setup", async () => {
  const { approvalRepository, setupDefinitionRepository } = await createRepositoryFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-002"),
    metadata
  });

  await assert.rejects(
    async () =>
      approvalRepository.create({
        approval: buildApproval("approval-003", "feedback-001", "setup-002"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_decision_approval" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});
