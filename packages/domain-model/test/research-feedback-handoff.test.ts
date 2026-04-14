import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchFeedbackDecisionRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  createHypothesisEvidenceToSetupFeedbackHandoff,
  createResearchService,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupAggregateResult,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-research-feedback",
  originTransitionId: "transition-research-feedback",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-research-feedback",
  sourceObservedAtUtc: "2026-04-23T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Research feedback setup",
  description: "Setup for hypothesis-evidence feedback handoff tests",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["fixed 24h evaluation"],
  invalidationAssumptions: ["invalidate on immediate breakdown"],
  createdAt: "2026-04-23T10:00:00.000Z",
  updatedAt: "2026-04-23T10:00:00.000Z"
});

const buildHypothesis = (
  id: string,
  setupDefinitionId: string,
  evidenceStatus: ResearchHypothesis["evidenceStatus"]
): ResearchHypothesis => ({
  id,
  title: "Research feedback hypothesis",
  description: "Updated hypothesis evidence should produce explicit setup-review recommendations.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["hypothesis evidence should drive recommendation-only setup review"],
  notes: [],
  evidenceStatus,
  evidenceSummary: "latest aggregate evidence summary",
  status: "active",
  createdAt: "2026-04-23T10:00:00.000Z",
  updatedAt: "2026-04-23T10:00:00.000Z"
});

const buildAggregateResult = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string
): SetupAggregateResult => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  aggregationScope: {
    setupDefinitionId,
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "single_symbol",
      symbolIds: ["BTC-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-04-01T00:00:00.000Z",
      endAtUtc: "2026-04-30T23:59:59.000Z"
    },
    hypothesisId: researchHypothesisId
  },
  status: "completed",
  totalCandidates: 8,
  completedEvaluations: 8,
  invalidatedEvaluations: 0,
  averagePercentageMove: 0.9,
  averageAbsoluteMove: 0.9,
  averageFinalOutcome: 0.3,
  averageMaxFavorableExcursion: 1.2,
  averageMaxAdverseExcursion: -0.6,
  positiveOutcomeCount: 6,
  computedAt: "2026-04-23T11:00:00.000Z",
  createdAt: "2026-04-23T11:00:00.000Z",
  updatedAt: "2026-04-23T11:00:00.000Z"
});

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const researchFeedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();

  const researchService = createResearchService({
    researchHypothesisRepository,
    setupDefinitionRepository,
    researchFeedbackDecisionRepository,
    setupAggregateResultRepository
  });

  const feedbackHandoff = createHypothesisEvidenceToSetupFeedbackHandoff({
    researchService,
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository
  });

  return {
    setupDefinitionRepository,
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    setupAggregateResultRepository,
    feedbackHandoff
  };
};

test("valid feedback-decision trigger shape", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    setupAggregateResultRepository,
    feedbackHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-feedback-001"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-feedback-001", "setup-feedback-001", "supports"),
    metadata
  });
  await setupAggregateResultRepository.create({
    aggregate: buildAggregateResult(
      "aggregate-feedback-001",
      "setup-feedback-001",
      "hypothesis-feedback-001"
    ),
    metadata
  });

  const result = await feedbackHandoff.review(
    {
      researchHypothesisId: "hypothesis-feedback-001",
      setupDefinitionId: "setup-feedback-001",
      latestEvidenceStatus: "supports",
      setupAggregateResultId: "aggregate-feedback-001",
      triggeredAt: "2026-04-23T12:05:00.000Z",
      evidenceSummary: "aggregate evidence supports hypothesis"
    },
    metadata
  );

  assert.equal(result.status, "recorded");
  assert.equal(result.recommendedAction, "keep_active");
  assert.equal(result.decisionStatus, "proposed");
  assert.equal(typeof result.researchFeedbackDecisionId, "string");
});

test("missing hypothesis rejected", async () => {
  const { setupDefinitionRepository, feedbackHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-feedback-002"),
    metadata
  });

  const result = await feedbackHandoff.review(
    {
      researchHypothesisId: "hypothesis-feedback-missing",
      setupDefinitionId: "setup-feedback-002",
      latestEvidenceStatus: "supports",
      triggeredAt: "2026-04-23T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("research_hypothesis not found"), true);
});

test("missing setup definition rejected", async () => {
  const { researchHypothesisRepository, feedbackHandoff } = createFixture();
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-feedback-003", "setup-feedback-003", "supports"),
    metadata
  });

  const result = await feedbackHandoff.review(
    {
      researchHypothesisId: "hypothesis-feedback-003",
      setupDefinitionId: "setup-feedback-003",
      latestEvidenceStatus: "supports",
      triggeredAt: "2026-04-23T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setup_definition not found"), true);
});

test("invalid evidence status rejected", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    feedbackHandoff
  } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-feedback-004"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-feedback-004", "setup-feedback-004", "supports"),
    metadata
  });

  const result = await feedbackHandoff.review(
    {
      researchHypothesisId: "hypothesis-feedback-004",
      setupDefinitionId: "setup-feedback-004",
      latestEvidenceStatus: "not_valid" as never,
      triggeredAt: "2026-04-23T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("invalid latestEvidenceStatus"), true);
});

test("decision outcome shape stays explicit", async () => {
  const { feedbackHandoff } = createFixture();

  const result = await feedbackHandoff.review(
    {
      researchHypothesisId: "",
      setupDefinitionId: "setup-feedback-005",
      latestEvidenceStatus: "supports",
      triggeredAt: "2026-04-23T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});

test("manual-review-required outcome stays explicit", async () => {
  const {
    setupDefinitionRepository,
    researchHypothesisRepository,
    feedbackHandoff
  } = createFixture();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-feedback-006"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-feedback-006", "setup-feedback-006", "inconclusive"),
    metadata
  });

  const result = await feedbackHandoff.review(
    {
      researchHypothesisId: "hypothesis-feedback-006",
      setupDefinitionId: "setup-feedback-006",
      latestEvidenceStatus: "inconclusive",
      triggeredAt: "2026-04-23T12:05:00.000Z"
    },
    metadata
  );

  assert.equal(result.status, "recorded");
  assert.equal(result.recommendedAction, "manual_review_required");
  assert.equal(result.decisionStatus, "proposed");
});
