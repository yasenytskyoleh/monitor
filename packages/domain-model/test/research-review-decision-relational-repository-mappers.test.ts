import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateResearchReviewDecisionToDurableRecord,
  hydrateResearchReviewDecisionFromDurableRecord,
  type ProductRecordMetadata,
  type ResearchReviewDecision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-review-decision-mapper-001",
  originTransitionId: "transition-review-decision-mapper-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-review-decision-mapper-001",
  sourceObservedAtUtc: "2026-06-30T10:00:00.000Z"
};

test("research-review-decision mapper round-trips optional references and action authorization", () => {
  const decision: ResearchReviewDecision = {
    id: "review-decision-001",
    researchReviewPacketId: "review-packet-001",
    setupFamilyId: "setup-family-001",
    setupRevisionId: "setup-family-001-v2",
    researchHypothesisId: "hypothesis-001",
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-06-30T10:05:00.000Z",
    decisionOutcome: "accepted",
    reviewerNotes: "Current revision remains valid after review.",
    authorizedNextAction: "confirm_no_change",
    decisionStatus: "recorded",
    createdAt: "2026-06-30T10:05:00.000Z",
    updatedAt: "2026-06-30T10:05:00.000Z"
  };

  const record = dehydrateResearchReviewDecisionToDurableRecord(decision, metadata, 1);
  const hydrated = hydrateResearchReviewDecisionFromDurableRecord(record);

  assert.equal(record.identity.version, 1);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "review-packet-001",
    "setup-family-001",
    "setup-family-001-v2",
    "hypothesis-001"
  ]);
  assert.equal(record.authorizedNextAction, "confirm_no_change");
  assert.equal(record.reviewerNotes, "Current revision remains valid after review.");
  assert.deepEqual(hydrated, decision);
});
