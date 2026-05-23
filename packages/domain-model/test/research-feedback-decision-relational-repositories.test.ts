import assert from "node:assert/strict";
import test from "node:test";

import {
  composeResearchFeedbackDecisionRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter,
  InMemorySetupAggregateRelationalRepositoryAdapter,
  RelationalResearchFeedbackDecisionRepository,
  RelationalResearchHypothesisRepository,
  RelationalSetupAggregateResultRepository,
  RelationalSetupDefinitionRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-feedback-001",
  originTransitionId: "transition-feedback-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-feedback-001",
  sourceObservedAtUtc: "2026-05-23T10:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T09:00:00.000Z"
});

const buildResearchHypothesis = (id: string, setupDefinitionId: string): ResearchHypothesis => ({
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
  lastEvidenceAssessedAt: "2026-05-23T10:00:00.000Z",
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T10:00:00.000Z"
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
    researchRunId: "run-feedback-001",
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
  computedAt: "2026-05-23T10:00:00.000Z",
  createdAt: "2026-05-23T09:30:00.000Z",
  updatedAt: "2026-05-23T10:00:00.000Z"
});

const buildDecision = (
  id: string,
  setupAggregateResultId = "aggregate-001"
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId,
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "aggregate evidence supports keeping the setup active",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "10 completed evaluations with positive asymmetry",
  createdAt: "2026-05-23T10:30:00.000Z",
  updatedAt: "2026-05-23T10:30:00.000Z"
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

  return {
    feedbackRepository: new RelationalResearchFeedbackDecisionRepository(feedbackAdapter),
    composedRepositories: composeResearchFeedbackDecisionRelationalRepositories(feedbackAdapter)
  };
};

test("relational feedback-decision repository persists status updates and reference lookups", async () => {
  const { feedbackRepository } = await createRepositoryFixture();

  await feedbackRepository.create({
    decision: buildDecision("feedback-001"),
    metadata
  });

  const updated = await feedbackRepository.updateStatus({
    researchFeedbackDecisionId: "feedback-001",
    status: "accepted",
    reviewerMetadata: {
      reviewedBy: "reviewer-001",
      reviewedAt: "2026-05-23T11:00:00.000Z",
      approvalOutcome: "approved"
    },
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-05-23T11:00:00.000Z"
    },
    expectedVersion: 1
  });
  const byId = await feedbackRepository.getById("feedback-001");
  const bySetup = await feedbackRepository.listBySetupDefinitionId("setup-001");
  const byHypothesis = await feedbackRepository.listByResearchHypothesisId("hypothesis-001");

  assert.equal(updated?.decisionStatus, "accepted");
  assert.equal(updated?.reviewerMetadata?.reviewedBy, "reviewer-001");
  assert.equal(byId?.updatedAt, "2026-05-23T11:00:00.000Z");
  assert.equal(bySetup.length, 1);
  assert.equal(byHypothesis.length, 1);
});

test("feedback-decision repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = await createRepositoryFixture();

  await composedRepositories.researchFeedbackDecisionRepository.create({
    decision: buildDecision("feedback-002"),
    metadata
  });

  const stored = await composedRepositories.researchFeedbackDecisionRepository.getById(
    "feedback-002"
  );

  assert.equal(stored?.setupDefinitionId, "setup-001");
  assert.equal(stored?.decisionStatus, "proposed");
});

test("relational feedback-decision repository surfaces invalid aggregate references", async () => {
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
  const feedbackRepository = new RelationalResearchFeedbackDecisionRepository(
    new InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter({
      loadSetupDefinitionRecord:
        firstDurableAdapter.loadSetupDefinitionRecord.bind(firstDurableAdapter),
      loadResearchHypothesisBundle:
        firstDurableAdapter.loadResearchHypothesisBundle.bind(firstDurableAdapter),
      loadSetupAggregateResultRecord:
        aggregateAdapter.loadSetupAggregateResultRecord.bind(aggregateAdapter)
    })
  );

  await assert.rejects(
    async () =>
      feedbackRepository.create({
        decision: buildDecision("feedback-003", "aggregate-404"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_feedback_decision" &&
      error.referenceEntityType === "setup_aggregate_result" &&
      error.referenceEntityId === "aggregate-404"
  );
});
