import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRevisionRelationalRepositoryAdapter,
  RepositoryError,
  SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_ERROR_MAPPING,
  SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_OPERATIONS,
  SETUP_DEFINITION_REVISION_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  SETUP_DEFINITION_REVISION_RELATIONAL_RETRYABLE_ERROR_CODES,
  isSetupDefinitionRevisionRelationalDeterministicErrorCode,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord,
  type SetupDefinitionRevisionDurableRecord,
  type SetupRefinementRequestDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-definition-revision-001",
  originTransitionId: "transition-setup-definition-revision-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-definition-revision-001",
  sourceObservedAtUtc: "2026-07-08T10:00:00.000Z"
};

const buildSetupDefinitionRecord = (
  setupDefinitionId: string,
  definitionStatus: SetupDefinitionDurableRecord["definitionStatus"] = "active"
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
  createdAtUtc: "2026-07-08T08:00:00.000Z",
  updatedAtUtc: "2026-07-08T09:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus,
  name: "Breakout Retest",
  description: "Retest after breakout with confirmation.",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate over fixed 24h window"],
  invalidationAssumptions: ["invalidate on failed reclaim"],
  traceMetadata: {
    originRunId: "run-setup-definition-revision-001",
    originTransitionId: "transition-setup-definition-revision-001",
    traceId: "trace-setup-definition-revision-001"
  }
});

const buildFeedbackDecisionRecord = (
  researchFeedbackDecisionId: string,
  setupDefinitionId: string
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
  createdAtUtc: "2026-07-08T08:30:00.000Z",
  updatedAtUtc: "2026-07-08T09:10:00.000Z",
  archivedAtUtc: null,
  metadata,
  decisionStatus: "accepted",
  setupDefinitionId,
  researchHypothesisId: "hypothesis-001",
  setupAggregateResultId: "aggregate-001",
  evidenceStatus: "supports",
  recommendedAction: "refine_definition",
  rationaleSummary: "The setup needs a narrower reclaim rule.",
  requiresManualReview: true,
  evidenceSummary: "Recent cohorts still work, but timing drift is visible.",
  reviewerMetadata: {
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-07-08T09:10:00.000Z",
    approvalOutcome: "approved"
  }
});

const buildApprovalRecord = (
  researchDecisionApprovalId: string,
  setupDefinitionId: string,
  researchFeedbackDecisionId: string
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
  createdAtUtc: "2026-07-08T09:15:00.000Z",
  updatedAtUtc: "2026-07-08T09:15:00.000Z",
  archivedAtUtc: null,
  metadata,
  approvalStatus: "recorded",
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-07-08T09:15:00.000Z",
  approvalOutcome: "approved",
  reviewerNotes: "Proceed with the revision follow-up.",
  authorizedNextAction: "refine_definition"
});

const buildSetupRefinementRequestRecord = (
  setupRefinementRequestId: string,
  setupDefinitionId: string,
  researchDecisionApprovalId: string,
  researchFeedbackDecisionId: string
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
  createdAtUtc: "2026-07-08T09:20:00.000Z",
  updatedAtUtc: "2026-07-08T09:20:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  sourceResearchDecisionApprovalId: researchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: researchFeedbackDecisionId,
  refinementStatus: "proposed",
  refinementRationaleSummary: "The setup remains valid but needs tighter timing rules.",
  requestedChangesSummary: "Tighten invalidation logic and add confirmation.",
  evidenceReferences: ["aggregate-001", researchFeedbackDecisionId],
  requestedBy: "research-service",
  requestedAtUtc: "2026-07-08T09:20:00.000Z",
  assignedReviewerId: null,
  assignedOwnerId: null
});

const buildSetupDefinitionRevisionRecord = (
  setupDefinitionRevisionId: string,
  setupDefinitionId = "setup-family-001-v2",
  previousSetupDefinitionId = "setup-family-001-v1",
  setupRefinementRequestId = "refinement-001",
  researchDecisionApprovalId = "approval-001",
  researchFeedbackDecisionId = "feedback-001",
  setupVersionNumber = 2
): SetupDefinitionRevisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition_revision",
    entityId: setupDefinitionRevisionId,
    version: 1,
    relatedEntityIds: [
      setupDefinitionId,
      previousSetupDefinitionId,
      setupRefinementRequestId,
      researchDecisionApprovalId,
      researchFeedbackDecisionId
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-08T10:00:00.000Z",
  updatedAtUtc: "2026-07-08T10:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  setupDefinitionId,
  previousSetupDefinitionId,
  setupFamilyId: "setup-family-001",
  setupVersionNumber,
  previousRevisionId: setupVersionNumber > 2 ? "revision-001" : null,
  revisionReason: "Tighten breakout criteria from approved refinement follow-up.",
  revisionStatus: "draft",
  changedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
  createdBy: "research_reviewer_1",
  notes: "Hold as draft until activation review.",
  sourceSetupRefinementRequestId: setupRefinementRequestId,
  sourceResearchDecisionApprovalId: researchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: researchFeedbackDecisionId
});

const createAdapter = ({
  setupDefinitions = [
    buildSetupDefinitionRecord("setup-family-001-v1"),
    buildSetupDefinitionRecord("setup-family-001-v2", "draft"),
    buildSetupDefinitionRecord("setup-family-001-v3", "draft")
  ],
  refinementRequests = [
    buildSetupRefinementRequestRecord(
      "refinement-001",
      "setup-family-001-v1",
      "approval-001",
      "feedback-001"
    ),
    buildSetupRefinementRequestRecord(
      "refinement-002",
      "setup-family-001-v2",
      "approval-002",
      "feedback-002"
    )
  ],
  approvals = [
    buildApprovalRecord("approval-001", "setup-family-001-v1", "feedback-001"),
    buildApprovalRecord("approval-002", "setup-family-001-v2", "feedback-002")
  ],
  feedbackDecisions = [
    buildFeedbackDecisionRecord("feedback-001", "setup-family-001-v1"),
    buildFeedbackDecisionRecord("feedback-002", "setup-family-001-v2")
  ]
}: {
  approvals?: ResearchDecisionApprovalDurableRecord[];
  feedbackDecisions?: ResearchFeedbackDecisionDurableRecord[];
  refinementRequests?: SetupRefinementRequestDurableRecord[];
  setupDefinitions?: SetupDefinitionDurableRecord[];
} = {}) => {
  const setupDefinitionsById = new Map(
    setupDefinitions.map((record) => [record.identity.entityId, record])
  );
  const refinementRequestsById = new Map(
    refinementRequests.map((record) => [record.identity.entityId, record])
  );
  const approvalsById = new Map(approvals.map((record) => [record.identity.entityId, record]));
  const feedbackDecisionsById = new Map(
    feedbackDecisions.map((record) => [record.identity.entityId, record])
  );

  return new InMemorySetupDefinitionRevisionRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async (setupDefinitionId) =>
      setupDefinitionsById.get(setupDefinitionId) ?? null,
    loadSetupRefinementRequestRecord: async (setupRefinementRequestId) =>
      refinementRequestsById.get(setupRefinementRequestId) ?? null,
    loadResearchDecisionApprovalRecord: async (researchDecisionApprovalId) =>
      approvalsById.get(researchDecisionApprovalId) ?? null,
    loadResearchFeedbackDecisionRecord: async (researchFeedbackDecisionId) =>
      feedbackDecisionsById.get(researchFeedbackDecisionId) ?? null
  });
};

test("exposes setup-definition-revision relational adapter contract constants", () => {
  assert.deepEqual(SETUP_DEFINITION_REVISION_RELATIONAL_DETERMINISTIC_ERROR_CODES, [
    "already_exists",
    "not_found",
    "version_mismatch",
    "invalid_reference"
  ]);
  assert.deepEqual(SETUP_DEFINITION_REVISION_RELATIONAL_RETRYABLE_ERROR_CODES, [
    "transient_failure",
    "unknown_failure"
  ]);
  assert.deepEqual(SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_ERROR_MAPPING, {
    deterministic: ["already_exists", "not_found", "version_mismatch", "invalid_reference"],
    retryable: ["transient_failure", "unknown_failure"]
  });
  assert.equal(
    SETUP_DEFINITION_REVISION_RELATIONAL_ADAPTER_OPERATIONS.includes(
      "update_setup_definition_revision_record"
    ),
    true
  );
  assert.equal(
    isSetupDefinitionRevisionRelationalDeterministicErrorCode("already_exists"),
    true
  );
  assert.equal(
    isSetupDefinitionRevisionRelationalDeterministicErrorCode("transient_failure"),
    false
  );
});

test("setup-definition-revision relational adapter rejects duplicate ids deterministically", async () => {
  const adapter = createAdapter();

  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord("revision-001"),
    expectedVersion: null
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord("revision-001"),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_definition_revision" &&
      error.operation === "create"
  );
});

test("setup-definition-revision relational adapter stores records for load, latest, and family-list queries", async () => {
  const adapter = createAdapter();

  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord("revision-001"),
    expectedVersion: null
  });
  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord(
      "revision-002",
      "setup-family-001-v3",
      "setup-family-001-v2",
      "refinement-002",
      "approval-002",
      "feedback-002",
      3
    ),
    expectedVersion: null
  });

  const byId = await adapter.loadSetupDefinitionRevisionRecord("revision-001");
  const bySetupDefinition =
    await adapter.loadSetupDefinitionRevisionRecordBySetupDefinitionId(
      "setup-family-001-v2"
    );
  const latestByFamily =
    await adapter.loadLatestSetupDefinitionRevisionRecordBySetupFamilyId(
      "setup-family-001"
    );
  const familyRecords =
    await adapter.listSetupDefinitionRevisionRecordsBySetupFamilyId("setup-family-001");

  assert.equal(byId?.identity.entityId, "revision-001");
  assert.equal(bySetupDefinition?.setupDefinitionId, "setup-family-001-v2");
  assert.equal(latestByFamily?.setupVersionNumber, 3);
  assert.deepEqual(
    familyRecords.map((record) => record.setupVersionNumber),
    [2, 3]
  );
});

test("setup-definition-revision relational adapter rejects missing setup references deterministically", async () => {
  const adapter = createAdapter({
    setupDefinitions: [buildSetupDefinitionRecord("setup-family-001-v1")]
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord("revision-missing-setup"),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-family-001-v2"
  );
});

test("setup-definition-revision relational adapter rejects missing refinement-request references deterministically", async () => {
  const adapter = createAdapter({ refinementRequests: [] });

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord("revision-missing-request"),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "setup_refinement_request" &&
      error.referenceEntityId === "refinement-001"
  );
});

test("setup-definition-revision relational adapter rejects mismatched refinement-request lineage deterministically", async () => {
  const adapter = createAdapter({
    refinementRequests: [
      buildSetupRefinementRequestRecord(
        "refinement-001",
        "setup-family-001-v2",
        "approval-001",
        "feedback-001"
      )
    ]
  });

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord("revision-bad-request-link"),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "setup_refinement_request" &&
      error.referenceEntityId === "refinement-001"
  );
});

test("setup-definition-revision relational adapter rejects missing approval references deterministically", async () => {
  const adapter = createAdapter({ approvals: [] });

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord("revision-missing-approval"),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "research_decision_approval" &&
      error.referenceEntityId === "approval-001"
  );
});

test("setup-definition-revision relational adapter rejects missing feedback references deterministically", async () => {
  const adapter = createAdapter({ feedbackDecisions: [] });

  await assert.rejects(
    async () =>
      adapter.insertSetupDefinitionRevisionRecord({
        record: buildSetupDefinitionRevisionRecord("revision-missing-feedback"),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "research_feedback_decision" &&
      error.referenceEntityId === "feedback-001"
  );
});

test("setup-definition-revision relational adapter rejects update version mismatches deterministically", async () => {
  const adapter = createAdapter();

  await adapter.insertSetupDefinitionRevisionRecord({
    record: buildSetupDefinitionRevisionRecord("revision-update-version"),
    expectedVersion: null
  });

  await assert.rejects(
    async () =>
      adapter.updateSetupDefinitionRevisionRecord({
        record: {
          ...buildSetupDefinitionRevisionRecord("revision-update-version"),
          identity: {
            ...buildSetupDefinitionRevisionRecord("revision-update-version").identity,
            version: 2
          },
          revisionStatus: "accepted",
          updatedAtUtc: "2026-07-08T10:15:00.000Z"
        },
        expectedVersion: 2
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "setup_definition_revision" &&
      error.expectedVersion === 2 &&
      error.actualVersion === 1
  );
});
