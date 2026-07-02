import assert from "node:assert/strict";
import test from "node:test";

import {
  composeRoutedActionExecutionEnvelopeRelationalRepositories,
  dehydrateResearchReviewDecisionToDurableRecord,
  InMemoryResearchReviewDecisionRelationalRepositoryAdapter,
  InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter,
  RelationalRoutedActionExecutionEnvelopeRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchReviewDecision,
  type RoutedActionExecutionEnvelope
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routed-action-repository-001",
  originTransitionId: "transition-routed-action-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routed-action-repository-001",
  sourceObservedAtUtc: "2026-07-02T10:00:00.000Z"
};

const buildReviewDecision = (id: string): ResearchReviewDecision => ({
  id,
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-family-001-v3",
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-07-02T09:50:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "Prepared action matches the approved review path.",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-07-02T09:50:00.000Z",
  updatedAt: "2026-07-02T09:50:00.000Z"
});

const buildEnvelope = (
  id: string,
  sourceReviewDecisionId = "review-decision-001"
): RoutedActionExecutionEnvelope => ({
  id,
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
  executionStatus: "prepared",
  preparedBy: "review-operator-001",
  preparedAt: "2026-07-02T10:05:00.000Z",
  notes: "Prepared for execution.",
  createdAt: "2026-07-02T10:05:00.000Z",
  updatedAt: "2026-07-02T10:05:00.000Z"
});

const createRepositoryFixture = async () => {
  const reviewDecisionAdapter = new InMemoryResearchReviewDecisionRelationalRepositoryAdapter({
    loadResearchHypothesisBundle: async () => null
  });
  await reviewDecisionAdapter.insertResearchReviewDecisionRecord({
    record: dehydrateResearchReviewDecisionToDurableRecord(
      buildReviewDecision("review-decision-001"),
      metadata,
      1
    )
  });

  const adapter = new InMemoryRoutedActionExecutionEnvelopeRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord:
      reviewDecisionAdapter.loadResearchReviewDecisionRecord.bind(reviewDecisionAdapter)
  });

  return {
    routedActionExecutionEnvelopeRepository:
      new RelationalRoutedActionExecutionEnvelopeRepository(adapter),
    composedRepositories:
      composeRoutedActionExecutionEnvelopeRelationalRepositories(adapter)
  };
};

test("relational routed-action repository persists and lists envelopes through the adapter boundary", async () => {
  const { routedActionExecutionEnvelopeRepository } = await createRepositoryFixture();

  const created = await routedActionExecutionEnvelopeRepository.create({
    envelope: buildEnvelope("execution-envelope-001"),
    metadata
  });
  const byId =
    await routedActionExecutionEnvelopeRepository.getById("execution-envelope-001");
  const byReviewDecision =
    await routedActionExecutionEnvelopeRepository.listByReviewDecisionId(
      "review-decision-001"
    );

  assert.equal(created.actionCommandType, "ApplyApprovedSetupMutationCommand");
  assert.equal(byId?.preparedBy, "review-operator-001");
  assert.equal(byReviewDecision.length, 1);
  assert.equal(byReviewDecision[0]?.sourceReviewDecisionId, "review-decision-001");
});

test("routed-action repository composition reuses one adapter boundary", async () => {
  const { composedRepositories } = await createRepositoryFixture();

  await composedRepositories.routedActionExecutionEnvelopeRepository.create({
    envelope: buildEnvelope("execution-envelope-002"),
    metadata
  });

  const stored =
    await composedRepositories.routedActionExecutionEnvelopeRepository.getById(
      "execution-envelope-002"
    );

  assert.equal(stored?.executionStatus, "prepared");
  assert.equal(stored?.notes, "Prepared for execution.");
});

test("relational routed-action repository rejects missing review-decision references", async () => {
  const { routedActionExecutionEnvelopeRepository } = await createRepositoryFixture();

  await assert.rejects(
    async () =>
      routedActionExecutionEnvelopeRepository.create({
        envelope: buildEnvelope("execution-envelope-003", "review-decision-missing"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "routed_action_execution_envelope" &&
      error.referenceEntityType === "research_review_decision" &&
      error.referenceEntityId === "review-decision-missing"
  );
});
