import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSetupDefinitionRevisionRelationalRepositories,
  InMemorySetupDefinitionRevisionRelationalRepositoryAdapter,
  RelationalSetupDefinitionRevisionRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchDecisionApprovalDurableRecord,
  type ResearchFeedbackDecisionDurableRecord,
  type SetupDefinitionDurableRecord,
  type SetupDefinitionRevision,
  type SetupRefinementRequestDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-definition-revision-repository-001",
  originTransitionId: "transition-setup-definition-revision-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-definition-revision-repository-001",
  sourceObservedAtUtc: "2026-07-09T10:00:00.000Z"
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
    version: 4,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-09T08:00:00.000Z",
  updatedAtUtc: "2026-07-09T09:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  definitionStatus,
  name: "Breakout Retest",
  description: "Retest after breakout with confirmation.",
  measurableConditions: ["4h close above range high"],
  evaluationAssumptions: ["evaluate continuation over 24h"],
  invalidationAssumptions: ["invalidate on failed reclaim"],
  traceMetadata: {
    originRunId: "run-setup-definition-revision-repository-001",
    originTransitionId: "transition-setup-definition-revision-repository-001",
    traceId: "trace-setup-definition-revision-repository-001"
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
  createdAtUtc: "2026-07-09T08:15:00.000Z",
  updatedAtUtc: "2026-07-09T08:45:00.000Z",
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
    reviewedAt: "2026-07-09T08:45:00.000Z",
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
  createdAtUtc: "2026-07-09T08:50:00.000Z",
  updatedAtUtc: "2026-07-09T08:50:00.000Z",
  archivedAtUtc: null,
  metadata,
  approvalStatus: "recorded",
  researchFeedbackDecisionId,
  setupDefinitionId,
  reviewedBy: "reviewer-001",
  reviewedAtUtc: "2026-07-09T08:50:00.000Z",
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
  createdAtUtc: "2026-07-09T09:00:00.000Z",
  updatedAtUtc: "2026-07-09T09:00:00.000Z",
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
  requestedAtUtc: "2026-07-09T09:00:00.000Z",
  assignedReviewerId: null,
  assignedOwnerId: null
});

const buildRevision = (
  id: string,
  setupDefinitionId = "setup-family-001-v2",
  previousSetupDefinitionId = "setup-family-001-v1",
  sourceSetupRefinementRequestId = "refinement-001",
  sourceResearchDecisionApprovalId = "approval-001",
  sourceResearchFeedbackDecisionId = "feedback-001",
  version = 2
): SetupDefinitionRevision => ({
  id,
  setupDefinitionId,
  previousSetupDefinitionId,
  versionInfo: {
    setupFamilyId: "setup-family-001",
    revisionId: id,
    version,
    ...(version > 2 ? { previousRevisionId: "revision-001" } : {})
  },
  revisionReason: "Tighten breakout criteria from approved refinement follow-up.",
  revisionStatus: "draft",
  changedFieldsSummary: "Updated measurable conditions and invalidation assumptions.",
  createdBy: "research_reviewer_1",
  createdAt: "2026-07-09T10:00:00.000Z",
  notes: "Hold as draft until activation review.",
  sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId,
  updatedAt: "2026-07-09T10:00:00.000Z"
});

const createRepositoryFixture = ({
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

  const adapter = new InMemorySetupDefinitionRevisionRelationalRepositoryAdapter({
    loadSetupDefinitionRecord: async (setupDefinitionId) =>
      setupDefinitionsById.get(setupDefinitionId) ?? null,
    loadSetupRefinementRequestRecord: async (setupRefinementRequestId) =>
      refinementRequestsById.get(setupRefinementRequestId) ?? null,
    loadResearchDecisionApprovalRecord: async (researchDecisionApprovalId) =>
      approvalsById.get(researchDecisionApprovalId) ?? null,
    loadResearchFeedbackDecisionRecord: async (researchFeedbackDecisionId) =>
      feedbackDecisionsById.get(researchFeedbackDecisionId) ?? null
  });

  return {
    setupDefinitionRevisionRepository:
      new RelationalSetupDefinitionRevisionRepository(adapter),
    composedRepositories:
      composeSetupDefinitionRevisionRelationalRepositories(adapter)
  };
};

test("relational setup-definition-revision repository persists status updates and family lookups", async () => {
  const { setupDefinitionRevisionRepository } = createRepositoryFixture();

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision("revision-001"),
    metadata
  });
  await setupDefinitionRevisionRepository.create({
    revision: buildRevision(
      "revision-002",
      "setup-family-001-v3",
      "setup-family-001-v2",
      "refinement-002",
      "approval-002",
      "feedback-002",
      3
    ),
    metadata
  });

  const updated = await setupDefinitionRevisionRepository.updateStatus({
    setupDefinitionRevisionId: "revision-001",
    status: "proposed",
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-07-09T11:00:00.000Z"
    },
    expectedVersion: 1
  });
  const byId = await setupDefinitionRevisionRepository.getById("revision-001");
  const bySetupDefinition =
    await setupDefinitionRevisionRepository.getBySetupDefinitionId(
      "setup-family-001-v2"
    );
  const latest =
    await setupDefinitionRevisionRepository.getLatestBySetupFamilyId(
      "setup-family-001"
    );
  const familyRevisions =
    await setupDefinitionRevisionRepository.listBySetupFamilyId(
      "setup-family-001"
    );

  assert.equal(updated?.revisionStatus, "proposed");
  assert.equal(byId?.updatedAt, "2026-07-09T11:00:00.000Z");
  assert.equal(bySetupDefinition?.versionInfo.version, 2);
  assert.equal(latest?.id, "revision-002");
  assert.deepEqual(
    familyRevisions.map((revision) => revision.versionInfo.version),
    [2, 3]
  );
});

test("setup-definition-revision repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = createRepositoryFixture();

  await composedRepositories.setupDefinitionRevisionRepository.create({
    revision: buildRevision("revision-003"),
    metadata
  });

  const stored =
    await composedRepositories.setupDefinitionRevisionRepository.getById(
      "revision-003"
    );

  assert.equal(stored?.sourceSetupRefinementRequestId, "refinement-001");
  assert.equal(stored?.revisionStatus, "draft");
});

test("relational setup-definition-revision repository rejects missing refinement-request references", async () => {
  const repository = new RelationalSetupDefinitionRevisionRepository(
    new InMemorySetupDefinitionRevisionRelationalRepositoryAdapter({
      loadSetupDefinitionRecord: async (setupDefinitionId) =>
        buildSetupDefinitionRecord(setupDefinitionId, "draft"),
      loadSetupRefinementRequestRecord: async () => null,
      loadResearchDecisionApprovalRecord: async (researchDecisionApprovalId) =>
        buildApprovalRecord(
          researchDecisionApprovalId,
          "setup-family-001-v1",
          "feedback-001"
        ),
      loadResearchFeedbackDecisionRecord: async (researchFeedbackDecisionId) =>
        buildFeedbackDecisionRecord(
          researchFeedbackDecisionId,
          "setup-family-001-v1"
        )
    })
  );

  await assert.rejects(
    async () =>
      repository.create({
        revision: buildRevision("revision-missing-request"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_definition_revision" &&
      error.referenceEntityType === "setup_refinement_request" &&
      error.referenceEntityId === "refinement-001"
  );
});

test("relational setup-definition-revision repository surfaces optimistic version mismatches", async () => {
  const { setupDefinitionRevisionRepository } = createRepositoryFixture();

  await setupDefinitionRevisionRepository.create({
    revision: buildRevision("revision-version-mismatch"),
    metadata
  });

  await assert.rejects(
    async () =>
      setupDefinitionRevisionRepository.updateStatus({
        setupDefinitionRevisionId: "revision-version-mismatch",
        status: "accepted",
        metadata: {
          ...metadata,
          sourceObservedAtUtc: "2026-07-09T11:30:00.000Z"
        },
        expectedVersion: 99
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "setup_definition_revision"
  );
});
