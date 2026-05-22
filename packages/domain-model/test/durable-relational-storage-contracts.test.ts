import assert from "node:assert/strict";
import test from "node:test";

import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type EvaluationResultDurableRecord,
  FIRST_DURABLE_RELATIONAL_ENTITY_TYPES,
  type ProductRecordMetadata,
  type ResearchHypothesisDurableRecord,
  type ResearchHypothesisSetupDefinitionLinkRecord,
  SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES,
  type SignalCandidateDurableRecord,
  type SetupDefinitionDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-12T09:00:00.000Z"
};

test("exposes first durable relational storage planning constants", () => {
  assert.deepEqual(DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS, ["product_domain.relational.v1"]);
  assert.deepEqual(FIRST_DURABLE_RELATIONAL_ENTITY_TYPES, [
    "setup_definition",
    "research_hypothesis"
  ]);
});

test("supports typed setup-definition and research-hypothesis durable records", () => {
  const setupRecord: SetupDefinitionDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "setup_definition",
      entityId: "setup-001",
      version: 2,
      relatedEntityIds: []
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-12T09:00:00.000Z",
    updatedAtUtc: "2026-05-12T10:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    definitionStatus: "active",
    name: "Breakout Retest",
    description: "Retest after breakout with continuation bias.",
    measurableConditions: ["4h close above range high"],
    evaluationAssumptions: ["evaluate over fixed 24h window"],
    invalidationAssumptions: ["invalidate on failed retest"],
    traceMetadata: {
      originRunId: "run-001",
      originTransitionId: "transition-001",
      traceId: "trace-001"
    }
  };

  const hypothesisRecord: ResearchHypothesisDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_hypothesis",
      entityId: "hypothesis-001",
      version: 3,
      relatedEntityIds: ["setup-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-12T09:00:00.000Z",
    updatedAtUtc: "2026-05-12T11:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    hypothesisStatus: "active",
    title: "Breakout retests outperform random entries",
    description: "Structured breakout retests should show positive asymmetry.",
    assumptions: ["median MFE exceeds median MAE over 50 samples"],
    notes: ["track only spot pairs"],
    evidenceStatus: "supports",
    evidenceSummary: "aggregate evidence supports continuation behavior",
    lastEvidenceAggregateResultId: "aggregate-001",
    lastEvidenceAssessedAt: "2026-05-12T11:00:00.000Z"
  };

  const linkRecord: ResearchHypothesisSetupDefinitionLinkRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    researchHypothesisId: "hypothesis-001",
    setupDefinitionId: "setup-001",
    linkedAtUtc: "2026-05-12T09:05:00.000Z"
  };

  assert.equal(setupRecord.identity.version, 2);
  assert.equal(hypothesisRecord.identity.version, 3);
  assert.equal(linkRecord.setupDefinitionId, "setup-001");
});

test("exposes signal/evaluation durable relational storage planning constants", () => {
  assert.deepEqual(SIGNAL_EVALUATION_RELATIONAL_ENTITY_TYPES, [
    "signal_candidate",
    "evaluation_result"
  ]);
});

test("supports typed signal-candidate and evaluation-result durable records", () => {
  const signalCandidateRecord: SignalCandidateDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "signal_candidate",
      entityId: "candidate-001",
      version: 2,
      relatedEntityIds: ["setup-001", "setup-001-rev-001", "BTC-USDT", "hit-001"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-22T08:00:00.000Z",
    updatedAtUtc: "2026-05-22T09:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    candidateStatus: "under_review",
    setupDefinitionId: "setup-001",
    setupRevisionId: "setup-001-rev-001",
    monitoredSymbolId: "BTC-USDT",
    detectionHitId: "hit-001",
    detectedAtUtc: "2026-05-22T08:00:00.000Z",
    evidenceSummary: "4h breakout retest with volume expansion",
    candidateOriginRunId: "run-detection-001"
  };

  const evaluationResultRecord: EvaluationResultDurableRecord = {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "evaluation_result",
      entityId: "result-001",
      version: 4,
      relatedEntityIds: ["candidate-001", "window-24h"]
    },
    lifecycleStatus: "active",
    createdAtUtc: "2026-05-22T08:30:00.000Z",
    updatedAtUtc: "2026-05-22T10:00:00.000Z",
    archivedAtUtc: null,
    metadata,
    evaluationStatus: "completed",
    signalCandidateId: "candidate-001",
    evaluationWindowId: "window-24h",
    referencePrice: 65000,
    finalPrice: 65800,
    highInWindow: 66400,
    lowInWindow: 64100,
    absoluteMove: 800,
    percentageMove: 1.230769,
    maxFavorableExcursion: 2.15,
    maxAdverseExcursion: -1.38,
    evaluatedAtUtc: "2026-05-23T08:30:00.000Z",
    notes: "completed through integration-like contract test"
  };

  assert.equal(signalCandidateRecord.identity.version, 2);
  assert.equal(signalCandidateRecord.candidateOriginRunId, "run-detection-001");
  assert.equal(evaluationResultRecord.identity.version, 4);
  assert.equal(evaluationResultRecord.evaluationStatus, "completed");
});
