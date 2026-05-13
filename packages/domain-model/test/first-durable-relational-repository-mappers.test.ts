import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateResearchHypothesisToDurableBundle,
  dehydrateSetupDefinitionToDurableRecord,
  hydrateResearchHypothesisFromDurableBundle,
  hydrateSetupDefinitionFromDurableRecord,
  type ProductRecordMetadata,
  type ResearchHypothesis,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-13T08:00:00.000Z"
};

test("setup-definition mapper round-trips archived lifecycle and trace metadata", () => {
  const definition: SetupDefinition = {
    id: "setup-001",
    name: "Breakout Retest",
    description: "Retest after breakout with continuation bias.",
    status: "archived",
    measurableConditions: ["4h close above range high"],
    evaluationAssumptions: ["evaluate over fixed 24h window"],
    invalidationAssumptions: ["invalidate on failed retest"],
    createdAt: "2026-05-13T07:00:00.000Z",
    updatedAt: "2026-05-13T08:00:00.000Z",
    traceMetadata: {
      originRunId: "run-001",
      originTransitionId: "transition-001",
      traceId: "trace-001"
    }
  };

  const record = dehydrateSetupDefinitionToDurableRecord(definition, metadata, 4);
  const hydrated = hydrateSetupDefinitionFromDurableRecord(record);

  assert.equal(record.identity.version, 4);
  assert.equal(record.lifecycleStatus, "archived");
  assert.equal(record.archivedAtUtc, definition.updatedAt);
  assert.deepEqual(hydrated, definition);
});

test("research-hypothesis mapper normalizes setup links and round-trips evidence fields", () => {
  const hypothesis: ResearchHypothesis = {
    id: "hypothesis-001",
    title: "Breakout retests outperform random entries",
    description: "Structured breakout retests should show positive asymmetry.",
    relatedSetupDefinitionIds: ["setup-001", " setup-001 ", "setup-002", ""],
    assumptions: ["median MFE exceeds median MAE over 50 samples"],
    notes: ["keep spot-only scope"],
    evidenceStatus: "supports",
    evidenceSummary: "aggregate evidence is positive",
    lastEvidenceAggregateResultId: "aggregate-001",
    lastEvidenceAssessedAt: "2026-05-13T09:00:00.000Z",
    status: "active",
    createdAt: "2026-05-13T07:00:00.000Z",
    updatedAt: "2026-05-13T09:00:00.000Z"
  };

  const bundle = dehydrateResearchHypothesisToDurableBundle(hypothesis, metadata, 3);
  const hydrated = hydrateResearchHypothesisFromDurableBundle(bundle);

  assert.equal(bundle.hypothesisRecord.identity.version, 3);
  assert.deepEqual(bundle.hypothesisRecord.identity.relatedEntityIds, ["setup-001", "setup-002"]);
  assert.deepEqual(
    bundle.setupDefinitionLinkRecords.map((linkRecord) => linkRecord.setupDefinitionId),
    ["setup-001", "setup-002"]
  );
  assert.deepEqual(hydrated.relatedSetupDefinitionIds, ["setup-001", "setup-002"]);
  assert.equal(hydrated.evidenceStatus, "supports");
  assert.equal(hydrated.lastEvidenceAggregateResultId, "aggregate-001");
});
