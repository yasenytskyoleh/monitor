import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateResearchDecisionApprovalToDurableRecord,
  hydrateResearchDecisionApprovalFromDurableRecord,
  type ProductRecordMetadata,
  type ResearchDecisionApproval
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-approval-001",
  originTransitionId: "transition-approval-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-approval-001",
  sourceObservedAtUtc: "2026-05-27T12:00:00.000Z"
};

test("research-decision-approval mapper round-trips approval metadata and action authorization", () => {
  const approval: ResearchDecisionApproval = {
    id: "approval-001",
    researchFeedbackDecisionId: "feedback-001",
    setupDefinitionId: "setup-001",
    reviewedBy: "reviewer-001",
    reviewedAt: "2026-05-27T12:05:00.000Z",
    approvalOutcome: "approved",
    reviewerNotes: "Approved after manual review.",
    approvalStatus: "recorded",
    authorizedNextAction: "keep_active",
    createdAt: "2026-05-27T12:05:00.000Z",
    updatedAt: "2026-05-27T12:05:00.000Z"
  };

  const record = dehydrateResearchDecisionApprovalToDurableRecord(approval, metadata, 1);
  const hydrated = hydrateResearchDecisionApprovalFromDurableRecord(record);

  assert.equal(record.identity.version, 1);
  assert.deepEqual(record.identity.relatedEntityIds, ["feedback-001", "setup-001"]);
  assert.equal(record.authorizedNextAction, "keep_active");
  assert.equal(record.reviewerNotes, "Approved after manual review.");
  assert.deepEqual(hydrated, approval);
});
