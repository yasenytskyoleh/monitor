import assert from "node:assert/strict";
import test from "node:test";

import {
  composeReviewDecisionRoutingResultRelationalRepositories,
  dehydrateResearchReviewDecisionToDurableRecord,
  dehydrateReviewDecisionRoutingResultToDurableRecord,
  hydrateReviewDecisionRoutingResultFromDurableRecord,
  InMemoryResearchReviewDecisionRelationalRepositoryAdapter,
  InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter,
  RelationalReviewDecisionRoutingResultRepository,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchReviewDecision,
  type ReviewDecisionRoutingResult
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-routing-result-repository-001",
  originTransitionId: "transition-routing-result-repository-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-routing-result-repository-001",
  sourceObservedAtUtc: "2026-07-23T10:00:00.000Z"
};

const buildReviewDecision = (id: string): ResearchReviewDecision => ({
  id,
  researchReviewPacketId: "review-packet-001",
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-revision-001",
  reviewedBy: "reviewer-001",
  reviewedAt: "2026-07-23T09:50:00.000Z",
  decisionOutcome: "accepted",
  reviewerNotes: "The routing result is ready for durable handoff.",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  decisionStatus: "recorded",
  createdAt: "2026-07-23T09:50:00.000Z",
  updatedAt: "2026-07-23T09:50:00.000Z"
});

const buildRoutingResult = (
  routingId: string,
  researchReviewDecisionId = "review-decision-001"
): ReviewDecisionRoutingResult => ({
  status: "routed",
  routingId,
  researchReviewDecisionId,
  setupFamilyId: "setup-family-001",
  setupRevisionId: "setup-revision-001",
  decisionOutcome: "accepted",
  authorizedNextAction: "prepare_lifecycle_mutation_follow_up",
  target: "apply_setup_lifecycle_mutation",
  downstreamCommandType: "ApplyApprovedSetupMutationCommand",
  routedAt: "2026-07-23T10:00:00.000Z",
  warnings: ["Routing context preserved for execution preparation."]
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

  const adapter = new InMemoryReviewDecisionRoutingResultRelationalRepositoryAdapter({
    loadResearchReviewDecisionRecord:
      reviewDecisionAdapter.loadResearchReviewDecisionRecord.bind(reviewDecisionAdapter)
  });

  return {
    repository: new RelationalReviewDecisionRoutingResultRepository(adapter),
    composed: composeReviewDecisionRoutingResultRelationalRepositories(adapter)
  };
};

test("routing-result mapper round-trips routable outcomes and derives immutable timestamps", () => {
  const result = buildRoutingResult("routing-result-001");
  const record = dehydrateReviewDecisionRoutingResultToDurableRecord(result, metadata, 1);

  assert.deepEqual(record.identity.relatedEntityIds, [
    "review-decision-001",
    "setup-family-001",
    "setup-revision-001"
  ]);
  assert.equal(record.createdAtUtc, result.routedAt);
  assert.equal(record.updatedAtUtc, result.routedAt);
  assert.deepEqual(hydrateReviewDecisionRoutingResultFromDurableRecord(record), result);
});

test("routing-result mapper rejects transient routing outcomes", () => {
  assert.throws(
    () =>
      dehydrateReviewDecisionRoutingResultToDurableRecord(
        {
          status: "rejected_validation",
          reason: "invalid input",
          warnings: []
        },
        metadata,
        1
      ),
    /cannot persist status/
  );
});

test("relational routing-result repository persists and lists through its adapter", async () => {
  const { repository } = await createRepositoryFixture();
  const created = await repository.create({
    result: buildRoutingResult("routing-result-002"),
    metadata
  });
  const byId = await repository.getById("routing-result-002");
  const byReviewDecision = await repository.listByReviewDecisionId("review-decision-001");

  assert.equal(created.routingId, "routing-result-002");
  assert.equal(byId?.target, "apply_setup_lifecycle_mutation");
  assert.equal(byReviewDecision.length, 1);
  assert.equal(byReviewDecision[0]?.researchReviewDecisionId, "review-decision-001");
});

test("routing-result repository composition reuses the adapter boundary", async () => {
  const { composed } = await createRepositoryFixture();
  await composed.reviewDecisionRoutingResultRepository.create({
    result: buildRoutingResult("routing-result-003"),
    metadata
  });

  const stored = await composed.reviewDecisionRoutingResultRepository.getById(
    "routing-result-003"
  );
  assert.equal(stored?.downstreamCommandType, "ApplyApprovedSetupMutationCommand");
});

test("relational routing-result repository rejects missing review-decision references", async () => {
  const { repository } = await createRepositoryFixture();

  await assert.rejects(
    async () =>
      repository.create({
        result: buildRoutingResult("routing-result-004", "review-decision-missing"),
        metadata
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.referenceEntityType === "research_review_decision" &&
      error.referenceEntityId === "review-decision-missing"
  );
});
