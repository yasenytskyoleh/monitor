import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchDecisionApprovalRelationalRepositoryAdapter,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_ERROR_MAPPING,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_OPERATIONS,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_RETRYABLE_ERROR_CODES,
  RepositoryError,
  isResearchDecisionApprovalRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-approval-001",
  originTransitionId: "transition-approval-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-approval-001",
  sourceObservedAtUtc: "2026-05-27T12:00:00.000Z"
};

const buildSetupDefinitionRecord = (setupDefinitionId: string): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: setupDefinitionId,
    version: 1,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-27T11:00:00.000Z",
  updatedAtUtc: "2026-05-27T11:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus: "active",
  name: "Breakout Retest",
  description: "Retest after breakout with continuation bias.",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed retest"],
  traceMetadata: {
    originRunId: "run-approval-001",
    originTransitionId: "transition-approval-001",
    traceId: "trace-approval-001"
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
  createdAtUtc: "2026-05-27T11:30:00.000Z",
  updatedAtUtc: "2026-05-27T12:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "accepted",
  setupDefinitionId,
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "keep_active",
  rationaleSummary: "Aggregate evidence supports keeping the setup active.",
  requiresManualReview: true,
  evidenceSummary: "10 completed evaluations with positive asymmetry.",
  reviewerMetadata: {
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-05-27T12:00:00.000Z",
    approvalOutcome: "approved"
  }
});

const buildApprovalRecord = (
  researchDecisionApprovalId: string,
  researchFeedbackDecisionId = "feedback-001",
  setupDefinitionId = "setup-001"
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
  createdAtUtc: "2026-05-27T12:00:00.000Z",
  updatedAtUtc: "2026-05-27T12:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  approvalStatus: "recorded",
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-05-27T12:00:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Approved after manual review.",
  authorizedNextAction: "keep_active"
});

test("exposes research-decision-approval relational adapter contract constants", () => {
  assert.deepEqual(RESEARCH_DECISION_APPROVAL_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(RESEARCH_DECISION_APPROVAL_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_research_decision_approval_record"
    ),
    true
  );
  assert.equal(isResearchDecisionApprovalRelationalDeterministicErrorCode("already_exists"), true);
  assert.equal(
    isResearchDecisionApprovalRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("approval relational adapter rejects duplicate approval ids deterministically", async () => {
  const adapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
    loadResearchFeedbackDecisionRecord: async () => buildFeedbackDecisionRecord("feedback-001"),
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001")
  });

  await adapter.insertResearchDecisionApprovalRecord({
    record: buildApprovalRecord("approval-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-001")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "research_decision_approval" &&
      error.operation === "create"
  );
});

test("approval relational adapter stores records for load and list queries", async () => {
  const adapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
    loadResearchFeedbackDecisionRecord: async () => buildFeedbackDecisionRecord("feedback-001"),
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001")
  });

  await adapter.insertResearchDecisionApprovalRecord({
    record: buildApprovalRecord("approval-004")
  });

  const byId = await adapter.loadResearchDecisionApprovalRecord("approval-004");
  const byFeedbackDecision =
    await adapter.listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId("feedback-001");

  assert.equal(byId?.identity.entityId, "approval-004");
  assert.equal(byFeedbackDecision.length, 1);
  assert.equal(byFeedbackDecision[0]?.researchFeedbackDecisionId, "feedback-001");
});

test("approval relational adapter rejects missing feedback-decision references deterministically", async () => {
  const adapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
    loadResearchFeedbackDecisionRecord: async () => null,
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-002")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_decision_approval" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});

test("approval relational adapter rejects missing setup-definition references deterministically", async () => {
  const adapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
    loadResearchFeedbackDecisionRecord: async () => buildFeedbackDecisionRecord("feedback-001"),
    loadSetupDefinitionRecord: async () => null
  });

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-005")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_decision_approval" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-001"
  );
});

test("approval relational adapter rejects mismatched feedback-decision setup references", async () => {
  const adapter = new InMemoryResearchDecisionApprovalRelationalRepositoryAdapter({
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-other"),
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertResearchDecisionApprovalRecord({
        record: buildApprovalRecord("approval-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_decision_approval" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});
