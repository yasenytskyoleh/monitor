import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateSetupLifecycleMutationRecordToDurableRecord,
  hydrateSetupLifecycleMutationRecordFromDurableRecord,
  type ProductRecordMetadata,
  type SetupLifecycleMutationRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-mutation-mapper-001",
  originTransitionId: "transition-setup-mutation-mapper-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-mutation-mapper-001",
  sourceObservedAtUtc: "2026-07-06T11:30:00.000Z"
};

test("setup-lifecycle-mutation mapper round-trips mutation lineage and notes", () => {
  const mutation: SetupLifecycleMutationRecord = {
    id: "setup-mutation-001",
    setupDefinitionId: "setup-001",
    researchDecisionApprovalId: "approval-001",
    researchFeedbackDecisionId: "feedback-001",
    previousStatus: "active",
    newStatus: "paused",
    approvedAction: "pause_setup",
    mutatedBy: "setup-operator-001",
    mutatedAt: "2026-07-06T11:30:00.000Z",
    notes: "Paused after approved feedback review.",
    createdAt: "2026-07-06T11:30:00.000Z",
    updatedAt: "2026-07-06T11:30:00.000Z"
  };

  const record = dehydrateSetupLifecycleMutationRecordToDurableRecord(mutation, metadata, 1);
  const hydrated = hydrateSetupLifecycleMutationRecordFromDurableRecord(record);

  assert.equal(record.identity.version, 1);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-001",
    "approval-001",
    "feedback-001"
  ]);
  assert.equal(record.notes, "Paused after approved feedback review.");
  assert.deepEqual(hydrated, mutation);
});
