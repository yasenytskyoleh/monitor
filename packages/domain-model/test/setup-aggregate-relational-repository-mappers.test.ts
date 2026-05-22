import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSetupAggregateScopeKey,
  dehydrateSetupAggregateResultToDurableRecord,
  hydrateSetupAggregateResultFromDurableRecord,
  type ProductRecordMetadata,
  type SetupAggregateResult
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-aggregate-001",
  originTransitionId: "transition-aggregate-001",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-aggregate-001",
  sourceObservedAtUtc: "2026-05-22T16:00:00.000Z"
};

const aggregate: SetupAggregateResult = {
  id: "aggregate-001",
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  aggregationScope: {
    setupDefinitionId: "setup-001",
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "symbol_set",
      symbolIds: ["BTC-USDT", "ETH-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-aggregate-001",
    hypothesisId: "hypothesis-001"
  },
  status: "completed",
  totalCandidates: 12,
  completedEvaluations: 10,
  invalidatedEvaluations: 2,
  averagePercentageMove: 1.84,
  averageAbsoluteMove: 142.5,
  averageFinalOutcome: 0.4,
  averageMaxFavorableExcursion: 2.15,
  averageMaxAdverseExcursion: -1.12,
  positiveOutcomeCount: 6,
  computedAt: "2026-05-22T16:00:00.000Z",
  notes: "aggregate mapper test",
  createdAt: "2026-05-22T15:00:00.000Z",
  updatedAt: "2026-05-22T16:00:00.000Z"
};

test("setup-aggregate mapper round-trips scope and related entity references", () => {
  const record = dehydrateSetupAggregateResultToDurableRecord(aggregate, metadata, 3);
  const hydrated = hydrateSetupAggregateResultFromDurableRecord(record);

  assert.equal(record.identity.version, 3);
  assert.deepEqual(record.identity.relatedEntityIds, [
    "setup-001",
    "hypothesis-001",
    "window-24h",
    "BTC-USDT",
    "ETH-USDT",
    "run-aggregate-001"
  ]);
  assert.equal(record.scopeKey, buildSetupAggregateScopeKey(aggregate.aggregationScope));
  assert.deepEqual(hydrated, aggregate);
});
