import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateEvaluationResultToDurableRecord,
  dehydrateSignalCandidateToDurableRecord,
  hydrateEvaluationResultFromDurableRecord,
  hydrateSignalCandidateFromDurableRecord,
  type EvaluationResult,
  type ProductRecordMetadata,
  type SignalCandidate
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "evaluation_pipeline",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-22T09:00:00.000Z",
  notes: "mapped in test"
};

test("signal-candidate mapper preserves related ids and optional origin fields", () => {
  const candidate: SignalCandidate = {
    id: "candidate-001",
    setupDefinitionId: "setup-001",
    setupRevisionId: "setup-001-rev-001",
    monitoredSymbolId: "BTC-USDT",
    detectionHitId: "hit-001",
    status: "under_review",
    detectedAt: "2026-05-22T09:15:00.000Z",
    evidenceSummary: "4h breakout retest with volume expansion",
    originRunId: "run-detection-001",
    createdAt: "2026-05-22T09:15:00.000Z",
    updatedAt: "2026-05-22T09:45:00.000Z"
  };

  const record = dehydrateSignalCandidateToDurableRecord(candidate, metadata, 3);
  const hydrated = hydrateSignalCandidateFromDurableRecord(record);

  assert.equal(record.identity.version, 3);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-001",
    "setup-001-rev-001",
    "BTC-USDT",
    "hit-001"
  ]);
  assert.equal(record.candidateOriginRunId, "run-detection-001");
  assert.equal(record.metadata.notes, "mapped in test");
  assert.deepEqual(hydrated, candidate);
});

test("evaluation-result mapper round-trips completed metrics and notes", () => {
  const result: EvaluationResult = {
    id: "result-001",
    signalCandidateId: "candidate-001",
    evaluationWindowId: "window-24h",
    status: "completed",
    referencePrice: 65000,
    finalPrice: 65800,
    highInWindow: 66400,
    lowInWindow: 64100,
    absoluteMove: 800,
    percentageMove: 1.230769,
    maxFavorableExcursion: 2.15,
    maxAdverseExcursion: -1.38,
    evaluatedAt: "2026-05-23T09:30:00.000Z",
    notes: "completed via mapper contract test",
    createdAt: "2026-05-22T09:30:00.000Z",
    updatedAt: "2026-05-23T09:30:00.000Z"
  };

  const record = dehydrateEvaluationResultToDurableRecord(result, metadata, 4);
  const hydrated = hydrateEvaluationResultFromDurableRecord(record);

  assert.equal(record.identity.version, 4);
  assert.deepEqual(record.identity.relatedEntityIds, ["candidate-001", "window-24h"]);
  assert.equal(record.notes, "completed via mapper contract test");
  assert.equal(record.evaluationStatus, "completed");
  assert.deepEqual(hydrated, result);
});
