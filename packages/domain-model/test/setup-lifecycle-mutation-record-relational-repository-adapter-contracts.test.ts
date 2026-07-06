import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter,
  RepositoryError,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_ERROR_MAPPING,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES,
  isSetupLifecycleMutationRecordRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord,
  type SetupLifecycleMutationRecordDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-mutation-001",
  originTransitionId: "transition-setup-mutation-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-mutation-001",
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
    originRunId: "run-setup-mutation-001",
    originTransitionId: "transition-setup-mutation-001",
    traceId: "trace-setup-mutation-001"
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

const buildMutationRecord = (
  setupLifecycleMutationRecordId: string,
  setupDefinitionId = "setup-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001"
): SetupLifecycleMutationRecordDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_lifecycle_mutation_record",
    entityId: setupLifecycleMutationRecordId,
    version: 1,
    relatedEntityIds: [
      setupDefinitionId,
      researchDecisionApprovalId,
      researchFeedbackDecisionId
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-06T11:30:00.000Z",
  updatedAtUtc: "2026-07-06T11:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  researchDecisionApprovalId,
  researchFeedbackDecisionId,
  previousStatus: "active",
  newStatus: "paused",
  approvedAction: "pause_setup",
  mutatedBy: "setup-operator-001",
  mutatedAtUtc: "2026-07-06T11:30:00.000Z",
  notes: "Paused after approved feedback review."
});

test("exposes setup-lifecycle-mutation-record relational adapter contract constants", () => {
  assert.deepEqual(SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_setup_lifecycle_mutation_record"
    ),
    true
  );
  assert.equal(
    isSetupLifecycleMutationRecordRelationalDeterministicErrorCode("already_exists"),
    true
  );
  assert.equal(
    isSetupLifecycleMutationRecordRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("setup-lifecycle mutation relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await adapter.insertSetupLifecycleMutationRecord({
    record: buildMutationRecord("mutation-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-001")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.operation === "create"
  );
});

test("setup-lifecycle mutation relational adapter stores records for load and list queries", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await adapter.insertSetupLifecycleMutationRecord({
    record: buildMutationRecord("mutation-002")
  });

  const byId = await adapter.loadSetupLifecycleMutationRecord("mutation-002");
  const bySetupDefinition =
    await adapter.listSetupLifecycleMutationRecordsBySetupDefinitionId("setup-001");
  const byApproval =
    await adapter.listSetupLifecycleMutationRecordsByResearchDecisionApprovalId("approval-001");

  assert.equal(byId?.identity.entityId, "mutation-002");
  assert.equal(bySetupDefinition.length, 1);
  assert.equal(bySetupDefinition[0]?.setupDefinitionId, "setup-001");
  assert.equal(byApproval.length, 1);
  assert.equal(byApproval[0]?.researchDecisionApprovalId, "approval-001");
});

test("setup-lifecycle mutation relational adapter rejects missing setup references deterministically", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => null,
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-001"
  );
});

test("setup-lifecycle mutation relational adapter rejects missing approval references deterministically", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () => null,
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-lifecycle mutation relational adapter rejects missing feedback references deterministically", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () => null
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-005")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});

test("setup-lifecycle mutation relational adapter rejects approvals linked to a different setup", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-other", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-006")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-lifecycle mutation relational adapter rejects approvals linked to a different feedback decision", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-other"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-007")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-lifecycle mutation relational adapter rejects feedback decisions linked to a different setup", async () => {
  const adapter = new InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async () => buildSetupDefinitionRecord("setup-001"),
    loadResearchDecisionApprovalRecord: async () =>
      buildApprovalRecord("approval-001", "setup-001", "feedback-001"),
    loadResearchFeedbackDecisionRecord: async () =>
      buildFeedbackDecisionRecord("feedback-001", "setup-other")
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupLifecycleMutationRecord({
        record: buildMutationRecord("mutation-008")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_lifecycle_mutation_record" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});
