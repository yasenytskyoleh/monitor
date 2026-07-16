import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupRefinementRequestRelationalRepositoryAdapter,
  RepositoryError,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_ERROR_MAPPING,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_OPERATIONS,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_RETRYABLE_ERROR_CODES,
  isSetupRefinementRequestRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord,
  type SetupRefinementRequestDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-refinement-001",
  originTransitionId: "transition-setup-refinement-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-refinement-001",
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
    originRunId: "run-setup-refinement-001",
    originTransitionId: "transition-setup-refinement-001",
    traceId: "trace-setup-refinement-001"
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

const buildSetupRefinementRequestRecord = (
  setupRefinementRequestId: string,
  setupDefinitionId = "setup-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001"
): SetupRefinementRequestDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_refinement_request",
    entityId: setupRefinementRequestId,
    version: 1,
    relatedEntityIds: [
      setupDefinitionId,
      researchDecisionApprovalId,
      researchFeedbackDecisionId
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T12:00:00.000Z",
  updatedAtUtc: "2026-07-06T12:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  sourceResearchDecisionApprovalId: researchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: researchFeedbackDecisionId,
  refinementStatus: "proposed",
  refinementRationaleSummary: "The setup remains valid but needs a narrower reclaim rule.",
  requestedChangesSummary: "Tighten invalidation logic and add rejection-volume confirmation.",
  evidenceReferences: ["aggregate-001", "feedback-001"],
  requestedBy: "research-service",
  requestedAtUtc: "2026-07-06T12:00:00.000Z",
  assignedReviewerId: null,
  assignedOwnerId: null
});

test("exposes setup-refinement-request relational adapter contract constants", () => {
  assert.deepEqual(SETUP_REFINEMENT_REQUEST_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(SETUP_REFINEMENT_REQUEST_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_setup_refinement_request"
    ),
    true
  );
  assert.equal(
    isSetupRefinementRequestRelationalDeterministicErrorCode("already_exists"),
    true
  );
  assert.equal(
    isSetupRefinementRequestRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("setup-refinement-request relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await adapter.insertSetupRefinementRequest({
    record: buildSetupRefinementRequestRecord("refinement-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-001")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_refinement_request" &&
      error.operation === "create"
  );
});

test("setup-refinement-request relational adapter stores records for load and list queries", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await adapter.insertSetupRefinementRequest({
    record: buildSetupRefinementRequestRecord("refinement-002")
  });

  const byId = await adapter.loadSetupRefinementRequest("refinement-002");
  const bySetupDefinition =
    await adapter.listSetupRefinementRequestsBySetupDefinitionId("setup-001");
  const byApproval =
    await adapter.listSetupRefinementRequestsByResearchDecisionApprovalId("approval-001");

  assert.equal(byId?.identity.entityId, "refinement-002");
  assert.equal(bySetupDefinition.length, 1);
  assert.equal(bySetupDefinition[0]?.setupDefinitionId, "setup-001");
  assert.equal(byApproval.length, 1);
  assert.equal(byApproval[0]?.sourceResearchDecisionApprovalId, "approval-001");
});

test("setup-refinement-request relational adapter rejects missing setup references deterministically", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => null,
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-001"
  );
});

test("setup-refinement-request relational adapter rejects missing approval references deterministically", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () => null,
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-refinement-request relational adapter rejects missing feedback references deterministically", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () => null
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-005")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});

test("setup-refinement-request relational adapter rejects approvals linked to a different setup", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-other", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-006")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-refinement-request relational adapter rejects approvals linked to a different feedback decision", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-other"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-007")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-refinement-request relational adapter rejects feedback decisions linked to a different setup", async () => {
  const adapter = new InMemorySetupRefinementRequestRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-other")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupRefinementRequest({
        record: buildSetupRefinementRequestRecord("refinement-008")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_refinement_request" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});
