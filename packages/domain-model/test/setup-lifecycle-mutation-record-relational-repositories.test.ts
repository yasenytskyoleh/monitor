import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSetupLifecycleMutationRecordRelationalRepositories,
  InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter,
  RelationalSetupLifecycleMutationRecordRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord,
  type SetupLifecycleMutationRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-mutation-repository-001",
  originTransitionId: "transition-setup-mutation-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-mutation-repository-001",
  sourceObservedAtUtc: "2026-07-06T11:30:00.000Z"
};

const buildSetupDefinitionRecord = (
  setupDefinitionId: string
): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: setupDefinitionId,
    version: 3,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T10:00:00.000Z",
  updatedAtUtc: "2026-07-06T11:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus: "active",
  name: "Momentum Compression",
  description: "Compression with follow-through confirmation.",
  measurableConditions: ["4h range compression below prior high"],
  evaluationAssumptions: ["evaluate continuation over 24h"],
  invalidationAssumptions: ["invalidate on failed reclaim"],
  traceMetadata: {
    originRunId: "run-setup-mutation-repository-001",
    originTransitionId: "transition-setup-mutation-repository-001",
    traceId: "trace-setup-mutation-repository-001"
  }
});

const buildFeedbackDecisionRecord = (
  researchFeedbackDecisionId: string,
  setupDefinitionId = "setup-001"
): ResearchFeedbackDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_feedback_decision",
    entityId: researchFeedbackDecisionId,
    version: 2,
    relatedEntityIds: [setupDefinitionId, "hypothesis-001", "aggregate-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T10:30:00.000Z",
  updatedAtUtc: "2026-07-06T11:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "accepted",
  setupDefinitionId,
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "pause_setup",
  rationaleSummary: "Recent downside asymmetry warrants pausing the setup.",
  requiresManualReview: true,
  evidenceSummary: "12 completed evaluations shifted negative over the last cohort.",
  reviewerMetadata: {
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-07-06T11:00:00.000Z",
    approvalOutcome: "approved"
  }
});

const buildApprovalRecord = (
  researchDecisionApprovalId: string,
  setupDefinitionId = "setup-001",
  researchFeedbackDecisionId = "feedback-001"
): ResearchDecisionApprovalDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_decision_approval",
    entityId: researchDecisionApprovalId,
    version: 1,
    relatedEntityIds: [researchFeedbackDecisionId, setupDefinitionId]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T11:00:00.000Z",
  updatedAtUtc: "2026-07-06T11:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  approvalStatus: "recorded",
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-07-06T11:00:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Pause the setup until new evidence arrives.",
  authorizedNextAction: "pause_setup"
});

const buildMutation = (
  id: string,
  setupDefinitionId = "setup-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001"
): SetupLifecycleMutationRecord => ({
  id,
  setupDefinitionId,
  researchDecisionApprovalId,
  researchFeedbackDecisionId,
  previousStatus: "active",
  newStatus: "paused",
  approvedAction: "pause_setup",
  mutatedBy: "setup-operator-001",
  mutatedAt: "2026-07-06T11:30:00.000Z",
  notes: "Paused after approved feedback review.",
  createdAt: "2026-07-06T11:30:00.000Z",
  updatedAt: "2026-07-06T11:30:00.000Z"
});

const createRepositoryFixture = () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  return {
    setupLifecycleMutationRecordRepository:
      new RelationalSetupLifecycleMutationRecordRepository(adapter),
    composedRepositories:
      composeSetupLifecycleMutationRecordRelationalRepositories(adapter)
  };
};

test("relational setup-lifecycle mutation repository persists and lists records through the adapter boundary", async () => {
  const { setupLifecycleMutationRecordRepository } = createRepositoryFixture();

  const created = await setupLifecycleMutationRecordRepository.create({
    mutation: buildMutation("mutation-001"),
    metadata
  });
  const byId = await setupLifecycleMutationRecordRepository.getById("mutation-001");
  const bySetupDefinition =
    await setupLifecycleMutationRecordRepository.listBySetupDefinitionId("setup-001");
  const byApproval =
    await setupLifecycleMutationRecordRepository.listByApprovalId("approval-001");

  assert.equal(created.approvedAction, "pause_setup");
  assert.equal(byId?.mutatedBy, "setup-operator-001");
  assert.equal(bySetupDefinition.length, 1);
  assert.equal(bySetupDefinition[0]?.setupDefinitionId, "setup-001");
  assert.equal(byApproval.length, 1);
  assert.equal(byApproval[0]?.researchDecisionApprovalId, "approval-001");
});

test("setup-lifecycle mutation repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = createRepositoryFixture();

  await composedRepositories.setupLifecycleMutationRecordRepository.create({
    mutation: buildMutation("mutation-002"),
    metadata
  });

  const stored =
    await composedRepositories.setupLifecycleMutationRecordRepository.getById(
      "mutation-002"
    );

  assert.equal(stored?.newStatus, "paused");
  assert.equal(stored?.notes, "Paused after approved feedback review.");
});

test("relational setup-lifecycle mutation repository rejects missing approval references", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () => null,
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });
  const repository = new RelationalSetupLifecycleMutationRecordRepository(adapter);

  await assert.rejects(
    async () =>
      repository.create({
        mutation: buildMutation("mutation-003"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});
