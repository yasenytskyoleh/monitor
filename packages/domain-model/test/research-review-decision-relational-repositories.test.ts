import assert from "node:assert/strict";
import test from "node:test";

import {
  composeResearchReviewDecisionRelationalRepositories,
  InMemoryFirstDurableRelationalRepositoryAdapter,
  InMemoryResearchReviewDecisionRelationalRepositoryAdapter,
  RelationalResearchHypothesisRepository,
  RelationalResearchReviewDecisionRepository,
  RelationalSetupDefinitionRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type ResearchReviewDecision,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-decision-repository-001",
  originTransitionId: "transition-review-decision-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-review-decision-repository-001",
  sourceObservedAtUtc: "2026-06-30T10:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  status: "active",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  createdAt: "2026-06-30T09:00:00.000Z",
  updatedAt: "2026-06-30T09:30:00.000Z"
});

const buildResearchHypothesis = (
  id: string,
  setupDefinitionId: string
): ResearchHypothesis => ({
  id,
  title: "Breakout retests retain edge after revision",
  description: "Revised setup family should preserve positive asymmetry.",
  relatedSetupDefinitionIds: [setupDefinitionId],
  assumptions: ["median MFE remains above median MAE"],
  notes: [],
  status: "active",
  evidenceStatus: "supports",
  evidenceSummary: "Prior aggregate evidence remains positive.",
  lastEvidenceAggregateResultId: "aggregate-001",
  lastEvidenceAssessedAt: "2026-06-30T09:30:00.000Z",
  createdAt: "2026-06-30T09:00:00.000Z",
  updatedAt: "2026-06-30T09:30:00.000Z"
});

const buildReviewDecision = (
  id: string,
  researchHypothesisId?: string
): ResearchReviewDecision => ({
  id,
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  ...(researchHypothesisId ? { researchHypothesisId } : {}),
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-06-30T10:05:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Current revision remains valid after review.",
  authorizedNextAction: "confirm_no_change",
  decisionStatus: "recorded",
  createdAt: "2026-06-30T10:05:00.000Z",
  updatedAt: "2026-06-30T10:05:00.000Z"
});

const createRepositoryFixture = async () => {
  const firstDurableAdapter = new InMemoryFirstDurableRelationalRepositoryAdapter();
  const setupDefinitionRepository = new RelationalSetupDefinitionRepository(firstDurableAdapter);
  const researchHypothesisRepository = new RelationalResearchHypothesisRepository(
    firstDurableAdapter
  );

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-001"),
    metadata
  });
  await researchHypothesisRepository.create({
    hypothesis: buildResearchHypothesis("hypothesis-001", "setup-001"),
    metadata
  });

  const adapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
    loadResearchHypothesisBundle:
      firstDurableAdapter.loadResearchHypothesisBundle.bind(firstDurableAdapter)
  });

  return {
    reviewDecisionRepository: new RelationalResearchReviewDecisionRepository(adapter),
    composedRepositories: composeResearchReviewDecisionRelationalRepositories(adapter)
  };
};

test("relational review-decision repository persists and lists decisions through the adapter boundary", async () => {
  const { reviewDecisionRepository } = await createRepositoryFixture();

  const created = await reviewDecisionRepository.create({
    decision: buildReviewDecision("review-decision-001", "hypothesis-001"),
    metadata
  });
  const byId = await reviewDecisionRepository.getById("review-decision-001");
  const byPacket = await reviewDecisionRepository.listByReviewPacketId("review-packet-001");
  const byFamily = await reviewDecisionRepository.listBySetupFamilyId("setup-family-001");

  assert.equal(created.decisionOutcome, "accepted");
  assert.equal(byId?.authorizedNextAction, "confirm_no_change");
  assert.equal(byPacket.length, 1);
  assert.equal(byPacket[0]?.researchReviewPacketId, "review-packet-001");
  assert.equal(byFamily.length, 1);
  assert.equal(byFamily[0]?.setupFamilyId, "setup-family-001");
});

test("review-decision repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = await createRepositoryFixture();

  await composedRepositories.researchReviewDecisionRepository.create({
    decision: buildReviewDecision("review-decision-002"),
    metadata
  });

  const stored = await composedRepositories.researchReviewDecisionRepository.getById(
    "review-decision-002"
  );

  assert.equal(stored?.decisionStatus, "recorded");
  assert.equal(stored?.reviewedBy, "reviewer-001");
  assert.equal(stored?.researchHypothesisId, undefined);
});

test("relational review-decision repository rejects missing hypothesis references", async () => {
  const { reviewDecisionRepository } = await createRepositoryFixture();

  await assert.rejects(
    async () =>
      reviewDecisionRepository.create({
        decision: buildReviewDecision("review-decision-003", "hypothesis-missing"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_review_decision" &&
      error.referenceEntityType === "research_hypothesis" &&
      error.referenceEntityId === "hypothesis-missing"
  );
});
