import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateSetupRefinementRequestToDurableRecord,
  hydrateSetupRefinementRequestFromDurableRecord,
  type ProductRecordMetadata,
  type SetupRefinementRequest
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-refinement-mapper-001",
  originTransitionId: "transition-setup-refinement-mapper-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-refinement-mapper-001",
  sourceObservedAtUtc: "2026-07-06T12:00:00.000Z"
};

test("setup-refinement-request mapper round-trips optional assignment fields and evidence normalization", () => {
  const request: SetupRefinementRequest = {
    id: "setup-refinement-001",
    setupDefinitionId: "setup-001",
    sourceResearchDecisionApprovalId: "approval-001",
    sourceResearchFeedbackDecisionId: "feedback-001",
    refinementRationaleSummary: "The setup needs tighter invalidation boundaries.",
    requestedChangesSummary: "Tighten the reclaim rule and add rejection-volume confirmation.",
    status: "proposed",
    requestedBy: "research-service",
    requestedAt: "2026-07-06T12:00:00.000Z",
    assignedReviewerId: "reviewer-001",
    createdAt: "2026-07-06T12:00:00.000Z",
    updatedAt: "2026-07-06T12:00:00.000Z"
  };

  const record = dehydrateSetupRefinementRequestToDurableRecord(request, metadata, 1);
  const hydrated = hydrateSetupRefinementRequestFromDurableRecord(record);

  assert.equal(record.identity.version, 1);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-001",
    "approval-001",
    "feedback-001"
  ]);
  assert.deepEqual(record.evidenceReferences, []);
  assert.equal(record.assignedReviewerId, "reviewer-001");
  assert.equal(record.assignedOwnerId, null);
  assert.deepEqual(hydrated, request);
});
