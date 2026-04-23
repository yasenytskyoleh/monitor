import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryEvaluationResultRepository,
  InMemoryResearchDecisionApprovalRepository,
  InMemoryResearchFeedbackDecisionRepository,
  InMemoryResearchHypothesisRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySignalCandidateRepository,
  createRevisionHistoryQueryService,
  type ProductRecordMetadata,
  type ResearchDecisionApproval,
  type ResearchFeedbackDecision,
  type ResearchHypothesis,
  type SetupDefinition,
  type SetupDefinitionRevision,
  type SetupRevisionImpactSummary
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-packet-query",
  originTransitionId: "transition-review-packet-query",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-review-packet-query",
  sourceObservedAtUtc: "2026-06-10T12:00:00.000Z"
};

const buildSetupDefinition = (
  id: string,
  status: SetupDefinition["status"]
): SetupDefinition => ({
  id,
  name: `Setup ${id}`,
  description: "Setup for review packet tests",
  status,
  measurableConditions: ["close above breakout level"],
  evaluationAssumptions: ["fixed 24h evaluation window"],
  invalidationAssumptions: ["invalidate on immediate downside reclaim"],
  createdAt: "2026-06-10T10:00:00.000Z",
  updatedAt: "2026-06-10T10:00:00.000Z"
});

const buildRevision = (
  id: string,
  setupDefinitionId: string,
  setupFamilyId: string,
  version: number
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  versionInfo: {
    setupFamilyId,
    revisionId: id,
    version
  },
  revisionReason: "review packet test revision",
  revisionStatus: "accepted",
  changedFieldsSummary: "updated setup assumptions",
  createdBy: "reviewer-1",
  createdAt: "2026-06-10T11:00:00.000Z",
  sourceSetupRefinementRequestId: `refinement-${id}`,
  updatedAt: "2026-06-10T11:00:00.000Z"
});

const buildHypothesis = (
  id: string,
  setupDefinitionId: string
): ResearchHypothesis => ({
  id,
  title: "Breakout continuation hypothesis",
  description: "Breakout continuation should outperform baseline",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["momentum persists post breakout"],
  notes: ["initial hypothesis"],
  evidenceStatus: "supports",
  evidenceSummary: "latest evidence supports continuation",
  lastEvidenceAggregateResultId: "aggregate-1",
  lastEvidenceAssessedAt: "2026-06-10T12:30:00.000Z",
  status: "active",
  createdAt: "2026-06-10T10:00:00.000Z",
  updatedAt: "2026-06-10T12:30:00.000Z"
});

const buildFeedbackDecision = (
  id: string,
  setupDefinitionId: string,
  researchHypothesisId: string
): ResearchFeedbackDecision => ({
  id,
  setupDefinitionId,
  researchHypothesisId,
  setupAggregateResultId: "aggregate-1",
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "metrics improved relative to baseline revision",
  decisionStatus: "proposed",
  requiresManualReview: true,
  evidenceSummary: "positive outcome rate and average move improved",
  createdAt: "2026-06-10T13:00:00.000Z",
  updatedAt: "2026-06-10T13:00:00.000Z"
});

const buildApproval = (
  id: string,
  setupDefinitionId: string,
  researchFeedbackDecisionId: string
): ResearchDecisionApproval => ({
  id,
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-1",
  reviewedAt: "2026-06-10T14:00:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "review packet complete enough for action",
  approvalStatus: "recorded",
  authorizedNextAction: "keep_active",
  createdAt: "2026-06-10T14:00:00.000Z",
  updatedAt: "2026-06-10T14:00:00.000Z"
});

const buildImpactSummary = (): SetupRevisionImpactSummary => ({
  setupFamilyId: "setup-family-600",
  baselineRevisionId: "revision-family-600-v1",
  targetRevisionId: "revision-family-600-v2",
  baselineVersion: 1,
  targetVersion: 2,
  summaryScope: {
    evaluationWindowId: "window-24h"
  },
  comparisonStatus: "compared",
  impactClassification: "improved",
  evidenceSufficiency: "sufficient",
  keyMetricChanges: {
    completedEvaluations: {
      baseline: 20,
      target: 24,
      delta: 4
    },
    positiveOutcomeRate: {
      baseline: 0.55,
      target: 0.66,
      delta: 0.11
    },
    averagePercentageMove: {
      baseline: 2.1,
      target: 3.0,
      delta: 0.9
    },
    averageFinalOutcome: {
      baseline: 0.2,
      target: 0.4,
      delta: 0.2
    },
    averageMaxFavorableExcursion: {
      baseline: 2.5,
      target: 3.2,
      delta: 0.7
    },
    averageMaxAdverseExcursion: {
      baseline: -1.7,
      target: -1.3,
      delta: 0.4
    }
  },
  baselineEvidenceCounts: {
    candidateCount: 30,
    evaluationCount: 24,
    aggregateCount: 2
  },
  targetEvidenceCounts: {
    candidateCount: 32,
    evaluationCount: 26,
    aggregateCount: 2
  },
  summarizedAt: "2026-06-10T15:00:00.000Z"
});

const createFixture = async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const researchHypothesisRepository = new InMemoryResearchHypothesisRepository();
  const researchFeedbackDecisionRepository = new InMemoryResearchFeedbackDecisionRepository();
  const researchDecisionApprovalRepository = new InMemoryResearchDecisionApprovalRepository();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-family-600-v2", "active"),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-family-600-v2",
      "setup-family-600-v2",
      "setup-family-600",
      2
    ),
    metadata
  });

  await researchHypothesisRepository.create({
    hypothesis: buildHypothesis("hypothesis-family-600", "setup-family-600-v2"),
    metadata
  });

  await researchFeedbackDecisionRepository.create({
    decision: buildFeedbackDecision(
      "feedback-family-600-v2",
      "setup-family-600-v2",
      "hypothesis-family-600"
    ),
    metadata
  });

  await researchDecisionApprovalRepository.create({
    approval: buildApproval(
      "approval-family-600-v2",
      "setup-family-600-v2",
      "feedback-family-600-v2"
    ),
    metadata
  });

  const queryService = createRevisionHistoryQueryService({
    setupDefinitionRevisionRepository,
    setupDefinitionRepository,
    signalCandidateRepository: new InMemorySignalCandidateRepository(),
    evaluationResultRepository: new InMemoryEvaluationResultRepository(),
    setupAggregateResultRepository: new InMemorySetupAggregateResultRepository(),
    researchHypothesisRepository,
    researchFeedbackDecisionRepository,
    researchDecisionApprovalRepository
  });

  return { queryService };
};

test("valid review-packet command shape", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.buildReviewPacket({
    setupFamilyId: "setup-family-600",
    setupRevisionId: "revision-family-600-v2",
    researchHypothesisId: "hypothesis-family-600",
    researchFeedbackDecisionId: "feedback-family-600-v2",
    researchDecisionApprovalId: "approval-family-600-v2",
    impactSummaryId: "impact-summary-family-600-v2",
    impactSummarySnapshot: buildImpactSummary(),
    builtAt: "2026-06-10T16:00:00.000Z"
  });

  assert.equal(result.status, "complete");
  assert.equal(result.packet?.status, "complete");
  assert.equal(result.packet?.setupFamilyId, "setup-family-600");
  assert.equal(result.packet?.setupRevisionId, "revision-family-600-v2");
});

test("missing setup family rejected", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.buildReviewPacket({
    setupFamilyId: " ",
    builtAt: "2026-06-10T16:00:00.000Z"
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.reason?.includes("setupFamilyId is required"), true);
});

test("missing essential context returns insufficient_context", async () => {
  const queryService = createRevisionHistoryQueryService({
    setupDefinitionRevisionRepository: new InMemorySetupDefinitionRevisionRepository(),
    setupDefinitionRepository: new InMemorySetupDefinitionRepository(),
    signalCandidateRepository: new InMemorySignalCandidateRepository(),
    evaluationResultRepository: new InMemoryEvaluationResultRepository(),
    setupAggregateResultRepository: new InMemorySetupAggregateResultRepository()
  });

  const result = await queryService.buildReviewPacket({
    setupFamilyId: "setup-family-missing",
    builtAt: "2026-06-10T16:00:00.000Z"
  });

  assert.equal(result.status, "insufficient_context");
  assert.equal(result.packet?.status, "insufficient_context");
  assert.equal(result.warnings.some((warning) => warning.includes("no setup revision context resolved")), true);
});

test("partial packet includes warnings", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.buildReviewPacket({
    setupFamilyId: "setup-family-600",
    setupRevisionId: "revision-family-600-v2",
    researchHypothesisId: "hypothesis-family-600",
    builtAt: "2026-06-10T16:00:00.000Z"
  });

  assert.equal(result.status, "partial");
  assert.equal((result.packet?.warnings.length ?? 0) > 0, true);
  assert.equal(result.packet?.status, "partial");
});

test("packet result keeps explicit included-artifact refs and statuses", async () => {
  const { queryService } = await createFixture();

  const result = await queryService.buildReviewPacket({
    setupFamilyId: "setup-family-600",
    setupRevisionId: "revision-family-600-v2",
    researchHypothesisId: "hypothesis-family-600",
    researchFeedbackDecisionId: "feedback-family-600-v2",
    researchDecisionApprovalId: "approval-family-600-v2",
    impactSummaryId: "impact-summary-family-600-v2",
    impactSummarySnapshot: buildImpactSummary(),
    builtAt: "2026-06-10T16:00:00.000Z"
  });

  assert.equal(result.status, "complete");
  assert.equal(result.packet?.includedArtifactRefs.setupRevisionId, "revision-family-600-v2");
  assert.equal(result.packet?.includedArtifactRefs.setupDefinitionId, "setup-family-600-v2");
  assert.equal(result.packet?.includedArtifactRefs.researchHypothesisId, "hypothesis-family-600");
  assert.equal(result.packet?.includedArtifactRefs.researchFeedbackDecisionId, "feedback-family-600-v2");
  assert.equal(result.packet?.includedArtifactRefs.researchDecisionApprovalId, "approval-family-600-v2");
  assert.equal(result.packet?.includedArtifactRefs.impactSummaryId, "impact-summary-family-600-v2");
  assert.equal(result.packet?.status, "complete");
});
