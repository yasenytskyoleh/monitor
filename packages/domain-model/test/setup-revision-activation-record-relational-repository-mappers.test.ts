import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateSetupRevisionActivationRecordToDurableRecord,
  hydrateSetupRevisionActivationRecordFromDurableRecord,
  type ProductRecordMetadata,
  type SetupRevisionActivationRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-setup-activation-mapper-001",
  originTransitionId: "transition-setup-activation-mapper-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-setup-activation-mapper-001",
  sourceObservedAtUtc: "2026-07-14T10:45:00.000Z"
};

test("setup-revision-activation mapper round-trips activation lineage", () => {
  const activation: SetupRevisionActivationRecord = {
    id: "activation-001",
    setupFamilyId: "setup-family-001",
    targetRevisionId: "revision-002",
    targetSetupDefinitionId: "setup-family-001-v2",
    previousRevisionId: "revision-001",
    previousSetupDefinitionId: "setup-family-001-v1",
    activatedBy: "research_reviewer_1",
    activatedAt: "2026-07-14T10:45:00.000Z",
    activationOutcome: "superseded_previous",
    rationale: "Promote the accepted revision after final review.",
    createdAt: "2026-07-14T10:45:00.000Z",
    updatedAt: "2026-07-14T10:46:00.000Z"
  };

  const record = dehydrateSetupRevisionActivationRecordToDurableRecord(
    activation,
    metadata,
    2
  );
  const hydrated = hydrateSetupRevisionActivationRecordFromDurableRecord(record);

  assert.equal(record.identity.version, 2);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-family-001",
    "revision-002",
    "setup-family-001-v2",
    "revision-001",
    "setup-family-001-v1"
  ]);
  assert.equal(record.rationale, "Promote the accepted revision after final review.");
  assert.deepEqual(hydrated, activation);
});
