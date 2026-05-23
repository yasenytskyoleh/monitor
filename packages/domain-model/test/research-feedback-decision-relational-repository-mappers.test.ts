import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateResearchFeedbackDecisionToDurableRecord,
  hydrateResearchFeedbackDecisionFromDurableRecord,
  type ProductRecordMetadata,
  type ResearchFeedbackDecision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-feedback-001",
  originTransitionId: "transition-feedback-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-feedback-001",
  sourceObservedAtUtc: "2026-05-23T10:00:00.000Z"
};

test("research-feedback-decision mapper round-trips reviewer metadata and aggregate linkage", () => {
  const decision: ResearchFeedbackDecision = {
    id: "feedback-001",
    setupDefinitionId: "setup-001",
    researchHypothesisId: "hypothesis-001",
    setupAggregateResultId: "aggregate-001",
    evidenceStatus: "supports",
    recommendedAction: "keep_active",
    rationaleSummary: "aggregate evidence supports keeping the setup active",
    decisionStatus: "accepted",
    requiresManualReview: true,
    evidenceSummary: "10 completed evaluations with positive asymmetry",
    reviewerMetadata: {
      reviewedBy: "reviewer-001",
      reviewedAt: "2026-05-23T11:00:00.000Z",
      approvalOutcome: "approved"
    },
    createdAt: "2026-05-23T10:00:00.000Z",
    updatedAt: "2026-05-23T11:00:00.000Z"
  };

  const record = dehydrateResearchFeedbackDecisionToDurableRecord(decision, metadata, 3);
  const hydrated = hydrateResearchFeedbackDecisionFromDurableRecord(record);

  assert.equal(record.identity.version, 3);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-001",
    "hypothesis-001",
    "aggregate-001"
  ]);
  assert.equal(record.reviewerMetadata?.reviewedBy, "reviewer-001");
  assert.deepEqual(hydrated, decision);
});
