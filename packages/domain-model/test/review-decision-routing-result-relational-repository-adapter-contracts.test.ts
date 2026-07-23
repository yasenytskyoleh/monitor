import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter,
  RepositoryError,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_ERROR_MAPPING,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_OPERATIONS,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_RETRYABLE_ERROR_CODES,
  isReviewDecisionRoutingResultRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchReviewDecisionDurableRecord,
  type ReviewDecisionRoutingResultDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routing-result-adapter-001",
  originTransitionId: "transition-routing-result-adapter-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routing-result-adapter-001",
  sourceObservedAtUtc: "2026-07-23T10:00:00.000Z"
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
    relatedEntityIds: ["review-packet-001", "setup-family-001", "setup-revision-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-23T09:45:00.000Z",
  updatedAtUtc: "2026-07-23T09:50:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "recorded",
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-revision-001",
  researchHypothesisId: null,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-07-23T09:50:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Approved follow-up action is consistent with the review packet.",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up"
});

const buildRoutingResultRecord = (
  reviewDecisionRoutingResultId: string,
  researchReviewDecisionId = "review-decision-001"
): ReviewDecisionRoutingResultDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "review_decision_routing_result",
    entityId: reviewDecisionRoutingResultId,
    version: 1,
    relatedEntityIds: [researchReviewDecisionId, "setup-family-001", "setup-revision-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-23T10:00:00.000Z",
  updatedAtUtc: "2026-07-23T10:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  routingStatus: "routed",
  researchReviewDecisionId,
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-revision-001",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  target: "apply_setup_lifecycle_mutation",
  downstreamCommandType: "ApplyApprovedSetupMutationCommand",
  routedAtUtc: "2026-07-23T10:00:00.000Z",
  reason: null,
  warnings: []
});

test("exposes review-decision-routing-result relational adapter contract constants", () => {
  assert.deepEqual(REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_review_decision_routing_result_record"
    ),
    true
  );
  assert.equal(
    isReviewDecisionRoutingResultRelationalDeterministicErrorCode("already_exists"),
    true
  );
  assert.equal(
    isReviewDecisionRoutingResultRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("routing-result relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = new InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord: async () =>
      buildResearchReviewDecisionRecord("review-decision-001")
  });

  await adapter.insertReviewDecisionRoutingResultRecord({
    record: buildRoutingResultRecord("routing-result-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertReviewDecisionRoutingResultRecord({
        record: buildRoutingResultRecord("routing-result-001")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "review_decision_routing_result" &&
      error.operation === "create"
  );
});

test("routing-result relational adapter stores records for load and list queries", async () => {
  const adapter = new InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord: async () =>
      buildResearchReviewDecisionRecord("review-decision-001")
  });

  await adapter.insertReviewDecisionRoutingResultRecord({
    record: buildRoutingResultRecord("routing-result-002")
  });

  const byId = await adapter.loadReviewDecisionRoutingResultRecord("routing-result-002");
  const byReviewDecision =
    await adapter.listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId(
      "review-decision-001"
    );

  assert.equal(byId?.identity.entityId, "routing-result-002");
  assert.equal(byReviewDecision.length, 1);
  assert.equal(byReviewDecision[0]?.researchReviewDecisionId, "review-decision-001");
});

test("routing-result relational adapter rejects missing review-decision references deterministically", async () => {
  const adapter = new InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord: async () => null
  });

  await assert.rejects(
    async () =>
      adapter.insertReviewDecisionRoutingResultRecord({
        record: buildRoutingResultRecord("routing-result-003")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "review_decision_routing_result" &&
      error.referenceEntityType === "research_review_decision" &&
      error.referenceEntityId === "review-decision-001"
  );
});
