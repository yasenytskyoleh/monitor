import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryResearchReviewDecisionRelationalRepositoryAdapter,
  RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_ERROR_MAPPING,
  RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_OPERATIONS,
  RESEARCH_REVIEW_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  RESEARCH_REVIEW_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES,
  RepositoryError,
  isResearchReviewDecisionRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchHypothesisDurableRecordBundle,
  type ResearchReviewDecisionDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-decision-001",
  originTransitionId: "transition-review-decision-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-review-decision-001",
  sourceObservedAtUtc: "2026-06-30T10:00:00.000Z"
};

const buildResearchHypothesisBundle = (
  researchHypothesisId: string
): ResearchHypothesisDurableRecordBundle => ({
  hypothesisRecord: {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_hypothesis",
      entityId: researchHypothesisId,
      version: 1,
      relatedEntityIds: ["setup-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-06-30T09:00:00.000Z",
    updatedAtUtc: "2026-06-30T09:30:00.000Z",
    archivedAtUtc: null,
    metadata,
    hypothesisStatus: "active",
    title: "Breakout retests retain edge after revision",
    description: "Revised setup family should preserve positive asymmetry.",
    assumptions: ["median MFE remains above median MAE"],
    notes: [],
    evidenceStatus: "supports",
    evidenceSummary: "Prior aggregate evidence remains positive.",
    lastEvidenceAggregateResultId: "aggregate-001",
    lastEvidenceAssessedAt: "2026-06-30T09:30:00.000Z"
  },
  setupDefinitionLinkRecords: [
    {
      storageSchemaVersion: "product_domain.relational.v1",
      researchHypothesisId,
      setupDefinitionId: "setup-001",
      linkedAtUtc: "2026-06-30T09:05:00.000Z"
    }
  ]
});

const buildReviewDecisionRecord = (
  researchReviewDecisionId: string,
  researchHypothesisId: string | null = "hypothesis-001"
): ResearchReviewDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_review_decision",
    entityId: researchReviewDecisionId,
    version: 1,
    relatedEntityIds: [
      "review-packet-001",
      "setup-family-001",
      "setup-family-001-v2",
      researchHypothesisId
    ].filter((value): value is string => value !== null)
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-06-30T10:05:00.000Z",
  updatedAtUtc: "2026-06-30T10:05:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "recorded",
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v2",
  researchHypothesisId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-06-30T10:05:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Review packet supports keeping the current revision active.",
  authorizedNextAction: "confirm_no_change"
});

test("exposes research-review-decision relational adapter contract constants", () => {
  assert.deepEqual(RESEARCH_REVIEW_DECISION_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "invalid_reference"
  ]);
  assert.deepEqual(RESEARCH_REVIEW_DECISION_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    RESEARCH_REVIEW_DECISION_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "insert_research_review_decision_record"
    ),
    true
  );
  assert.equal(isResearchReviewDecisionRelationalDeterministicErrorCode("already_exists"), true);
  assert.equal(
    isResearchReviewDecisionRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("review-decision relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
    loadResearchHypothesisBundle: async () => buildResearchHypothesisBundle("hypothesis-001")
  });

  await adapter.insertResearchReviewDecisionRecord({
    record: buildReviewDecisionRecord("review-decision-001")
  });

  await assert.rejects(
    async () =>
      adapter.insertResearchReviewDecisionRecord({
        record: buildReviewDecisionRecord("review-decision-001")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "research_review_decision" &&
      error.operation === "create"
  );
});

test("review-decision relational adapter stores records for load and list queries", async () => {
  const adapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
    loadResearchHypothesisBundle: async () => buildResearchHypothesisBundle("hypothesis-001")
  });

  await adapter.insertResearchReviewDecisionRecord({
    record: buildReviewDecisionRecord("review-decision-002")
  });

  const byId = await adapter.loadResearchReviewDecisionRecord("review-decision-002");
  const byPacket =
    await adapter.listResearchReviewDecisionRecordsByReviewPacketId("review-packet-001");
  const byFamily =
    await adapter.listResearchReviewDecisionRecordsBySetupFamilyId("setup-family-001");

  assert.equal(byId?.identity.entityId, "review-decision-002");
  assert.equal(byPacket.length, 1);
  assert.equal(byPacket[0]?.researchReviewPacketId, "review-packet-001");
  assert.equal(byFamily.length, 1);
  assert.equal(byFamily[0]?.setupFamilyId, "setup-family-001");
});

test("review-decision relational adapter allows omitted hypothesis references", async () => {
  const adapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
    loadResearchHypothesisBundle: async () => null
  });

  const inserted = await adapter.insertResearchReviewDecisionRecord({
    record: buildReviewDecisionRecord("review-decision-003", null)
  });

  assert.equal(inserted.researchHypothesisId, null);
});

test("review-decision relational adapter rejects missing hypothesis references deterministically", async () => {
  const adapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
    loadResearchHypothesisBundle: async () => null
  });

  await assert.rejects(
    async () =>
      adapter.insertResearchReviewDecisionRecord({
        record: buildReviewDecisionRecord("review-decision-004")
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "research_review_decision" &&
      error.referenceEntityType === "research_hypothesis" &&
      error.referenceEntityId === "hypothesis-001"
  );
});
