import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSetupRefinementRequestRelationalRepositories,
  InMemorySetupRefinementRequestRelationalRepositoryAdapter,
  RelationalSetupRefinementRequestRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord,
  type SetupRefinementRequest
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-refinement-repository-001",
  originTransitionId: "transition-setup-refinement-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-refinement-repository-001",
  sourceObservedAtUtc: "2026-07-06T12:00:00.000Z"
};

const buildSetupDefinitionRecord = (
  setupDefinitionId: string
): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: setupDefinitionId,
    version: 4,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T10:00:00.000Z",
  updatedAtUtc: "2026-07-06T11:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus: "active",
  name: "Momentum Compression",
  description: "Compression with follow-through confirmation.",
  measurableConditions: ["4h range compression below prior high"],
  evaluationAssumptions: ["evaluate continuation over 24h"],
  invalidationAssumptions: ["invalidate on failed reclaim"],
  traceMetadata: {
    originRunId: "run-setup-refinement-repository-001",
    originTransitionId: "transition-setup-refinement-repository-001",
    traceId: "trace-setup-refinement-repository-001"
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
  updatedAtUtc: "2026-07-06T11:10:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "accepted",
  setupDefinitionId,
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "refine_definition",
  rationaleSummary: "The setup needs tighter invalidation boundaries.",
  requiresManualReview: true,
  evidenceSummary: "Recent cohorts still work, but timing drift is visible.",
  reviewerMetadata: {
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-07-06T11:10:00.000Z",
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
  createdAtUtc: "2026-07-06T11:15:00.000Z",
  updatedAtUtc: "2026-07-06T11:15:00.000Z",
  archivedAtUtc: null,
  metadata,
  approvalStatus: "recorded",
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-07-06T11:15:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Proceed with a structured refinement follow-up.",
  authorizedNextAction: "refine_definition"
});

const buildSetupRefinementRequest = (
  id: string,
  setupDefinitionId = "setup-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001"
): SetupRefinementRequest => ({
  id,
  setupDefinitionId,
  sourceResearchDecisionApprovalId: researchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: researchFeedbackDecisionId,
  refinementRationaleSummary: "The setup remains valid but needs a narrower reclaim rule.",
  requestedChangesSummary: "Tighten invalidation logic and add rejection-volume confirmation.",
  evidenceReferences: ["aggregate-001", "feedback-001"],
  status: "proposed",
  requestedBy: "research-service",
  requestedAt: "2026-07-06T12:00:00.000Z",
  assignedReviewerId: "reviewer-001",
  createdAt: "2026-07-06T12:00:00.000Z",
  updatedAt: "2026-07-06T12:00:00.000Z"
});

const createRepositoryFixture = () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  return {
    setupRefinementRequestRepository:
      new RelationalSetupRefinementRequestRepository(adapter),
    composedRepositories:
      composeSetupRefinementRequestRelationalRepositories(adapter)
  };
};

test("relational setup-refinement-request repository persists and lists records through the adapter boundary", async () => {
  const { setupRefinementRequestRepository } = createRepositoryFixture();

  const created = await setupRefinementRequestRepository.create({
    request: buildSetupRefinementRequest("refinement-001"),
    metadata
  });
  const byId = await setupRefinementRequestRepository.getById("refinement-001");
  const bySetupDefinition =
    await setupRefinementRequestRepository.listBySetupDefinitionId("setup-001");
  const byApproval =
    await setupRefinementRequestRepository.listByApprovalId("approval-001");

  assert.equal(created.status, "proposed");
  assert.equal(byId?.assignedReviewerId, "reviewer-001");
  assert.equal(bySetupDefinition.length, 1);
  assert.equal(bySetupDefinition[0]?.setupDefinitionId, "setup-001");
  assert.equal(byApproval.length, 1);
  assert.equal(byApproval[0]?.sourceResearchDecisionApprovalId, "approval-001");
});

test("setup-refinement-request repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = createRepositoryFixture();

  await composedRepositories.setupRefinementRequestRepository.create({
    request: buildSetupRefinementRequest("refinement-002"),
    metadata
  });

  const stored =
    await composedRepositories.setupRefinementRequestRepository.getById(
      "refinement-002"
    );

  assert.equal(stored?.requestedBy, "research-service");
  assert.deepEqual(stored?.evidenceReferences, ["aggregate-001", "feedback-001"]);
});

test("relational setup-refinement-request repository rejects missing approval references", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () => null,
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });
  const repository = new RelationalSetupRefinementRequestRepository(adapter);

  await assert.rejects(
    async () =>
      repository.create({
        request: buildSetupRefinementRequest("refinement-003"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});
