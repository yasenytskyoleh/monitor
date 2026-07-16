import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateSetupDefinitionRevisionToDurableRecord,
  hydrateSetupDefinitionRevisionFromDurableRecord,
  type ProductRecordMetadata,
  type SetupDefinitionRevision
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-definition-revision-mapper-001",
  originTransitionId: "transition-setup-definition-revision-mapper-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-definition-revision-mapper-001",
  sourceObservedAtUtc: "2026-07-09T10:00:00.000Z"
};

test("setup-definition-revision mapper round-trips revision lineage and optional sources", () => {
  const revision: SetupDefinitionRevision = {
    id: "revision-001",
    setupDefinitionId: "setup-family-001-v2",
    previousSetupDefinitionId: "setup-family-001-v1",
    versionInfo: {
      setupFamilyId: "setup-family-001",
      revisionId: "revision-001",
      version: 2,
      previousRevisionId: "revision-000"
    },
    revisionReason: "Tighten invalidation after approved refinement follow-up.",
    revisionStatus: "draft",
    changedFieldsSummary: "Updated entry timing and invalidation assumptions.",
    createdBy: "research_reviewer_1",
    createdAt: "2026-07-09T10:00:00.000Z",
    notes: "Hold until activation review completes.",
    sourceSetupRefinementRequestId: "refinement-001",
    sourceResearchDecisionApprovalId: "approval-001",
    sourceResearchFeedbackDecisionId: "feedback-001",
    updatedAt: "2026-07-09T10:15:00.000Z"
  };

  const record = dehydrateSetupDefinitionRevisionToDurableRecord(revision, metadata, 3);
  const hydrated = hydrateSetupDefinitionRevisionFromDurableRecord(record);

  assert.equal(record.identity.version, 3);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-family-001-v2",
    "setup-family-001-v1",
    "refinement-001",
    "approval-001",
    "feedback-001",
    "revision-000"
  ]);
  assert.equal(record.notes, "Hold until activation review completes.");
  assert.equal(hydrated.versionInfo.revisionId, "revision-001");
  assert.deepEqual(hydrated, revision);
});
