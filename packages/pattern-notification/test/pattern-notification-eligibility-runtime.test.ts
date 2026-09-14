import assert from "node:assert/strict";
import test from "node:test";

import type { SetupAggregateResult, SignalCandidate } from "@monitor/domain-model";

import { createPatternNotificationEligibilityRuntime } from "../src/index.js";

const candidate: SignalCandidate = {
  id: "candidate-001",
  setupDefinitionId: "setup-001",
  setupRevisionId: "revision-001",
  monitoredSymbolId: "btc-usdt",
  detectionHitId: "detection-001",
  status: "detected",
  detectedAt: "2026-08-09T10:00:00.000Z",
  evidenceSummary: "5m bullish breakout",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z"
};

const aggregate: SetupAggregateResult = {
  id: "aggregate-001",
  setupDefinitionId: "setup-001",
  aggregationScope: {
    setupDefinitionId: "setup-001",
    evaluationWindowId: "closed-candle-24h-v1",
    symbolScope: { kind: "single_symbol", symbolIds: ["btc-usdt"] },
    timeRange: {
      startAtUtc: "2026-01-01T00:00:00.000Z",
      endAtUtc: "2026-08-01T00:00:00.000Z"
    }
  },
  status: "completed",
  totalCandidates: 40,
  completedEvaluations: 40,
  invalidatedEvaluations: 0,
  averagePercentageMove: 1.25,
  averageAbsoluteMove: 850,
  averageFinalOutcome: 0.5,
  averageMaxFavorableExcursion: 1200,
  averageMaxAdverseExcursion: -350,
  positiveOutcomeCount: 30,
  computedAt: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const createRuntime = (
  currentCandidate: SignalCandidate | null = candidate,
  currentAggregate: SetupAggregateResult | null = aggregate
) =>
  createPatternNotificationEligibilityRuntime({
    signalCandidateRepository: { async getById(): Promise<SignalCandidate | null> { return currentCandidate; } },
    setupAggregateResultRepository: {
      async getById(): Promise<SetupAggregateResult | null> {
        return currentAggregate;
      }
    },
    policy: {
      policyId: "btc-breakout-v1",
      minCompletedEvaluations: 30,
      minPositiveOutcomeRate: 0.6,
      minAveragePercentageMove: 0.5,
      maxSignalAgeMs: 15 * 60 * 1_000,
      maxAggregateAgeMs: 14 * 24 * 60 * 60 * 1_000
    }
  });

const request = {
  signalCandidateId: candidate.id,
  setupAggregateResultId: aggregate.id,
  direction: "consider_long" as const,
  observedAt: "2026-08-09T10:00:00.000Z",
  currentPrice: 67_000
};

test("creates an explainable, deduplicated notification candidate from live signal and historical evidence", async () => {
  const result = await createRuntime().assess(request);

  assert.deepEqual(result, {
    status: "eligible",
    candidate: {
      notificationId: "notification:candidate-001",
      deduplicationKey: "signal_candidate:candidate-001",
      signalCandidateId: "candidate-001",
      setupDefinitionId: "setup-001",
      setupRevisionId: "revision-001",
      monitoredSymbolId: "btc-usdt",
      setupAggregateResultId: "aggregate-001",
      direction: "consider_long",
      observedAt: "2026-08-09T10:00:00.000Z",
      currentPrice: 67_000,
      policyId: "btc-breakout-v1",
      completedEvaluations: 40,
      positiveOutcomeRate: 0.75,
      averagePercentageMove: 1.25,
      aggregateComputedAt: "2026-08-01T00:00:00.000Z"
    },
    warnings: []
  });
});

test("does not make notification candidates from stale signals or insufficient evidence", async () => {
  const staleSignal = await createRuntime({ ...candidate, status: "evaluated" }).assess(request);
  const staleDetectedSignal = await createRuntime({
    ...candidate,
    detectedAt: "2026-08-09T09:00:00.000Z"
  }).assess(request);
  const weakEvidence = await createRuntime(candidate, {
    ...aggregate,
    positiveOutcomeCount: 20,
    averagePercentageMove: 0.25
  }).assess(request);
  const staleAggregate = await createRuntime(candidate, {
    ...aggregate,
    computedAt: "2026-07-01T00:00:00.000Z"
  }).assess(request);

  assert.deepEqual(staleSignal, {
    status: "ineligible",
    reason: "signal_candidate_not_detected",
    warnings: []
  });
  assert.deepEqual(staleDetectedSignal, {
    status: "ineligible",
    reason: "signal_candidate_stale",
    warnings: []
  });
  assert.deepEqual(weakEvidence, {
    status: "ineligible",
    reason: "positive_outcome_rate_below_threshold",
    warnings: []
  });
  assert.deepEqual(staleAggregate, {
    status: "ineligible",
    reason: "setup_aggregate_result_stale",
    warnings: []
  });
});

test("rejects malformed requests and mismatched aggregate scopes", async () => {
  const runtime = createRuntime(candidate, {
    ...aggregate,
    aggregationScope: {
      ...aggregate.aggregationScope,
      symbolScope: { kind: "single_symbol", symbolIds: ["eth-usdt"] }
    }
  });

  assert.equal((await runtime.assess({ ...request, currentPrice: 0 })).status, "rejected_validation");
  assert.equal(
    (await runtime.assess({ ...request, direction: "consider_short" as "consider_long" })).status,
    "rejected_validation"
  );
  assert.deepEqual(await runtime.assess(request), {
    status: "ineligible",
    reason: "setup_aggregate_result_scope_mismatch",
    warnings: []
  });
});

test("rejects malformed persisted candidates and aggregate scopes without retrying", async () => {
  const malformedCandidate = createRuntime(
    { ...candidate, monitoredSymbolId: "" } as SignalCandidate,
    aggregate
  );
  const malformedAggregate = createRuntime(candidate, {
    ...aggregate,
    aggregationScope: null
  } as unknown as SetupAggregateResult);

  assert.deepEqual(await malformedCandidate.assess(request), {
    status: "ineligible",
    reason: "signal_candidate_invalid",
    warnings: []
  });
  assert.deepEqual(await malformedAggregate.assess(request), {
    status: "ineligible",
    reason: "setup_aggregate_result_invalid",
    warnings: []
  });
  const nonFiniteAggregate = createRuntime(candidate, {
    ...aggregate,
    averagePercentageMove: Number.NaN
  });
  assert.deepEqual(await nonFiniteAggregate.assess(request), {
    status: "ineligible",
    reason: "setup_aggregate_result_invalid",
    warnings: []
  });
});
