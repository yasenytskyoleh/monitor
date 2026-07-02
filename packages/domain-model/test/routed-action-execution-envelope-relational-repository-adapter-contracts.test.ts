import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_ERROR_MAPPING,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_OPERATIONS,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_RETRYABLE_ERROR_CODES,
  RepositoryError,
  isRoutedActionExecutionEnvelopeRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchReviewDecisionDurableRecord,
  type RoutedActionExecutionEnvelopeDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routed-action-adapter-001",
  originTransitionId: "transition-routed-action-adapter-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routed-action-adapter-001",
  sourceObservedAtUtc: "2026-07-02T10:00:00.000Z"
};

const buildResearchReviewDecisionRecord = (
  researchReviewDecisionId: string
): ResearchReviewDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_review_decision",
    entityId: researchReviewDecisionId,
    version: 1,
    relatedEntityIds: ["review-packet-001", "setup-family-001", "setup-family-001-v3"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-02T09:45:00.000Z",
  updatedAtUtc: "2026-07-02T09:50:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "recorded",
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v3",
  researchHypothesisId: null,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-07-02T09:50:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Approved follow-up action is consistent with the review packet.",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up"
});

const buildRoutedActionExecutionEnvelopeRecord = (
  routedActionExecutionEnvelopeId: string,
  sourceReviewDecisionId = "review-decision-001"
): RoutedActionExecutionEnvelopeDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "routed_action_execution_envelope",
    entityId: routedActionExecutionEnvelopeId,
    version: 1,
    relatedEntityIds: [
      "routing-result-001",
      sourceReviewDecisionId,
      "setup-family-001",
      "setup-definition-001"
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-02T10:05:00.000Z",
  updatedAtUtc: "2026-07-02T10:05:00.000Z",
  archivedAtUtc: null,
  metadata,
  executionStatus: "prepared",
  sourceRoutingResultId: "routing-result-001",
  sourceReviewDecisionId,
  actionTarget: "apply_setup_lifecycle_mutation",
  actionCommandType: "ApplyApprovedSetupMutationCommand",
  targetEntityRefs: {
    setupFamilyId: "setup-family-001",
    setupDefinitionId: "setup-definition-001",
    researchDecisionApprovalId: "approval-001"
  },
  routeMetadataSnapshot: {
    routeStatus: "routed",
    routedAt: "2026-07-02T10:00:00.000Z",
    decisionOutcome: "accepted",
    authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
    downstreamCommandType: "ApplyApprovedSetupMutationCommand"
  },
  executionPayloadSnapshot: {
    commandType: "ApplyApprovedSetupMutationCommand",
    target: "apply_setup_lifecycle_mutation",
    commandInput: {
      setupDefinitionId: "setup-definition-001",
      setupFamilyId: "setup-family-001",
      sourceReviewDecisionId,
      sourceRoutingResultId: "routing-result-001"
    }
  },
  preparedBy: "review-operator-001",
  preparedAtUtc: "2026-07-02T10:05:00.000Z",
  originRunId: "run-routed-action-001",
  notes: "Prepared for lifecycle mutation execution."
});

test("exposes routed-action-execution-envelope relational adapter contract constants", () => {
  assert.deepEqual(ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_routed_action_execution_envelope_record"
    ),
    true
  );
  assert.equal(
    isRoutedActionExecutionEnvelopeRelationalDeterministicErrorCode("already_exists"),
    true
  );
  assert.equal(
    isRoutedActionExecutionEnvelopeRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("routed-action relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = new InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord: async () =>
      buildResearchReviewDecisionRecord("review-decision-001")
  });

  await adapter.insertRoutedActionExecutionEnvelopeRecord({
    record: buildRoutedActionExecutionEnvelopeRecord("execution-envelope-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertRoutedActionExecutionEnvelopeRecord({
        record: buildRoutedActionExecutionEnvelopeRecord("execution-envelope-001")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "routed_action_execution_envelope" &&
      error.operation === "create"
  );
});

test("routed-action relational adapter stores records for load and list queries", async () => {
  const adapter = new InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord: async () =>
      buildResearchReviewDecisionRecord("review-decision-001")
  });

  await adapter.insertRoutedActionExecutionEnvelopeRecord({
    record: buildRoutedActionExecutionEnvelopeRecord("execution-envelope-002")
  });

  const byId =
    await adapter.loadRoutedActionExecutionEnvelopeRecord("execution-envelope-002");
  const byReviewDecision =
    await adapter.listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId(
      "review-decision-001"
    );

  assert.equal(byId?.identity.entityId, "execution-envelope-002");
  assert.equal(byReviewDecision.length, 1);
  assert.equal(byReviewDecision[0]?.sourceReviewDecisionId, "review-decision-001");
});

test("routed-action relational adapter rejects missing review-decision references deterministically", async () => {
  const adapter = new InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord: async () => null
  });

  await assert.rejects(
    async () =>
      adapter.insertRoutedActionExecutionEnvelopeRecord({
        record: buildRoutedActionExecutionEnvelopeRecord("execution-envelope-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "routed_action_execution_envelope" &&
      error.referenceEntityType === "research_review_decision" &&
      error.referenceEntityId === "review-decision-001"
  );
});
