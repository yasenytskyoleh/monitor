import assert from "node:assert/strict";
import test from "node:test";

import {
  AGGREGATE_COMPUTATION_STATUSES,
  AGGREGATION_SYMBOL_SCOPE_KINDS,
  DEFAULT_STORAGE_TECHNOLOGY_DIRECTION,
  EVALUATION_OUTCOMES,
  EVALUATION_OUTCOME_SUMMARIES,
  EVALUATION_START_REFERENCE_RULES,
  EVALUATION_STATUSES,
  EVALUATION_WINDOW_MODES,
  EVALUATION_WINDOW_UNITS,
  FIRST_CLASS_PERSISTED_ENTITY_PROFILES,
  HYPOTHESIS_EVIDENCE_STATUSES,
  MARKET_DATA_PROVIDER_KINDS,
  MARKET_DATA_SOURCE_STATUSES,
  MONITORING_HEARTBEAT_STATUSES,
  MONITORING_SCHEMA_VERSIONS,
  MONITORED_SYMBOL_STATUSES,
  NORMALIZED_EVENT_TYPES,
  PERSISTED_ENTITY_LIFECYCLE_STATUSES,
  PRODUCT_EPHEMERAL_ENTITY_TYPES,
  PRODUCT_PERSISTED_ENTITY_TYPES,
  PRODUCT_RECORD_SOURCES,
  RESEARCH_HYPOTHESIS_STATUSES,
  RUNTIME_EVIDENCE_ARTIFACT_TYPES,
  SETUP_DEFINITION_STATUSES,
  SIGNAL_CANDIDATE_STATUSES,
  STORAGE_BOUNDARIES,
  TIMEFRAME_LABELS,
  type AggregateMetrics,
  type AggregationScope,
  type EvaluationInput,
  type EvaluationMetrics,
  type EvaluationResult,
  type EvaluationWindow,
  type MarketDataSource,
  type MonitoredSymbol,
  type NormalizedMarketEvent,
  type PersistedEntity,
  type PriceTickEvent,
  type ProductEntityIdentity,
  type ProductRecordMetadata,
  type ResearchAggregationInput,
  type ResearchHypothesisEvidenceLink,
  type ResearchHypothesis,
  type ResearchRun,
  type SetupDefinition,
  type SetupAggregateResult,
  type SetupComparison,
  type SignalCandidate
} from "../src/index.js";

test("exposes expected lifecycle enums for the first product-domain slice", () => {
  assert.deepEqual(MONITORED_SYMBOL_STATUSES, ["active", "paused", "archived"]);
  assert.deepEqual(SETUP_DEFINITION_STATUSES, ["draft", "active", "archived"]);
  assert.deepEqual(SIGNAL_CANDIDATE_STATUSES, ["detected", "under_review", "evaluated", "discarded"]);
  assert.deepEqual(EVALUATION_WINDOW_MODES, ["time_based"]);
  assert.deepEqual(EVALUATION_WINDOW_UNITS, ["minutes", "hours", "days"]);
  assert.deepEqual(EVALUATION_START_REFERENCE_RULES, ["signal_detected_at"]);
  assert.deepEqual(EVALUATION_STATUSES, ["pending", "in_progress", "completed", "expired", "invalidated"]);
  assert.deepEqual(EVALUATION_OUTCOME_SUMMARIES, ["up", "down", "flat", "mixed", "insufficient_data"]);
  assert.deepEqual(EVALUATION_OUTCOMES, ["up", "down", "flat", "mixed", "insufficient_data"]);
  assert.deepEqual(AGGREGATE_COMPUTATION_STATUSES, ["pending", "completed", "partial", "invalid"]);
  assert.deepEqual(HYPOTHESIS_EVIDENCE_STATUSES, ["supports", "weakens", "inconclusive"]);
  assert.deepEqual(AGGREGATION_SYMBOL_SCOPE_KINDS, ["single_symbol", "symbol_set", "all_monitored"]);
  assert.deepEqual(STORAGE_BOUNDARIES, ["runtime_evidence", "product_domain", "derived_analytics"]);
  assert.deepEqual(RUNTIME_EVIDENCE_ARTIFACT_TYPES, [
    "run_record",
    "transition_record",
    "approval_record",
    "artifact_record",
    "backend_execution_evidence"
  ]);
  assert.deepEqual(PRODUCT_PERSISTED_ENTITY_TYPES, [
    "monitored_symbol",
    "setup_definition",
    "signal_candidate",
    "evaluation_result",
    "research_hypothesis",
    "setup_aggregate_result"
  ]);
  assert.deepEqual(PRODUCT_EPHEMERAL_ENTITY_TYPES, [
    "detection_input_transient",
    "setup_comparison_view",
    "orchestration_task_envelope"
  ]);
  assert.deepEqual(PRODUCT_RECORD_SOURCES, [
    "monitoring_pipeline",
    "detection_pipeline",
    "evaluation_pipeline",
    "research_aggregation_pipeline",
    "manual_curation",
    "migration_backfill"
  ]);
  assert.deepEqual(PERSISTED_ENTITY_LIFECYCLE_STATUSES, ["active", "archived"]);
  assert.equal(DEFAULT_STORAGE_TECHNOLOGY_DIRECTION.productDomain, "relational_planned");
  assert.equal(FIRST_CLASS_PERSISTED_ENTITY_PROFILES.length, 6);
  assert.deepEqual(RESEARCH_HYPOTHESIS_STATUSES, ["draft", "active", "paused", "closed"]);
  assert.deepEqual(MARKET_DATA_PROVIDER_KINDS, ["exchange_adapter"]);
  assert.deepEqual(MARKET_DATA_SOURCE_STATUSES, ["active", "degraded", "paused"]);
  assert.deepEqual(MONITORING_SCHEMA_VERSIONS, ["monitoring.v1"]);
  assert.deepEqual(NORMALIZED_EVENT_TYPES, ["price_tick", "candle_closed", "volume_update", "monitoring_heartbeat"]);
  assert.deepEqual(TIMEFRAME_LABELS, ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"]);
  assert.deepEqual(MONITORING_HEARTBEAT_STATUSES, ["ok", "degraded", "stalled"]);
});

test("supports constructing typed contracts without implementation logic", () => {
  const symbol: MonitoredSymbol = {
    symbolId: "BTC-USDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    displayName: "BTC/USDT",
    marketScope: "spot",
    status: "active",
    providerHint: "unknown",
    tags: ["core"],
    sourceBindings: [
      {
        sourceId: "source-primary",
        providerSymbol: "BTCUSDT",
        canonicalSymbol: "BTC-USDT",
        isPrimary: true
      }
    ],
    createdAtUtc: "2026-04-14T10:00:00.000Z",
    updatedAtUtc: "2026-04-14T10:00:00.000Z"
  };

  const setup: SetupDefinition = {
    setupId: "setup-breakout-001",
    name: "Breakout Retest",
    description: "Retest after breakout with volume confirmation",
    status: "active",
    monitoredSymbolIds: [symbol.symbolId],
    conditions: [
      {
        field: "close_above_range_high",
        operator: "eq",
        value: true,
        timeframe: "4h"
      }
    ],
    evaluationAssumptions: ["evaluate over fixed 24h horizon"],
    invalidationAssumptions: ["discard if immediate breakdown below retest level"],
    tags: ["breakout", "trend"],
    createdAtUtc: "2026-04-14T10:00:00.000Z",
    updatedAtUtc: "2026-04-14T10:00:00.000Z"
  };

  const candidate: SignalCandidate = {
    candidateId: "candidate-001",
    setupId: setup.setupId,
    symbolId: symbol.symbolId,
    detectedAtUtc: "2026-04-14T10:30:00.000Z",
    status: "detected",
    evidence: [
      {
        evidenceId: "evt-001",
        source: "monitor_event",
        description: "range break with elevated volume"
      }
    ],
    createdAtUtc: "2026-04-14T10:30:00.000Z",
    updatedAtUtc: "2026-04-14T10:30:00.000Z"
  };

  const window: EvaluationWindow = {
    windowId: "window-001",
    signalCandidateId: candidate.candidateId,
    mode: "time_based",
    purpose: "post_detection_outcome",
    startReferenceRule: "signal_detected_at",
    startAtUtc: "2026-04-14T10:30:00.000Z",
    endAtUtc: "2026-04-15T10:30:00.000Z",
    durationValue: 24,
    durationUnit: "hours",
    createdAtUtc: "2026-04-14T10:30:00.000Z",
    updatedAtUtc: "2026-04-14T10:30:00.000Z"
  };

  const input: EvaluationInput = {
    inputId: "input-001",
    signalCandidateId: candidate.candidateId,
    evaluationWindowId: window.windowId,
    observationReferences: [
      {
        sourceId: "source-primary",
        expectedEventTypes: ["price_tick", "candle_closed"],
        note: "use normalized observation streams only"
      }
    ],
    context: {
      contextLabel: "baseline",
      limitations: ["single-provider observation only"]
    },
    createdAtUtc: "2026-04-14T10:30:00.000Z",
    updatedAtUtc: "2026-04-14T10:30:00.000Z"
  };

  const metrics: EvaluationMetrics = {
    referencePriceAtDetection: 65000,
    highestObservedPriceInWindow: 66400,
    lowestObservedPriceInWindow: 64100,
    finalObservedPriceAtWindowEnd: 65800,
    absoluteMove: 800,
    percentageMove: 1.23,
    maxFavorableExcursion: 2.15,
    maxAdverseExcursion: -1.38
  };

  const result: EvaluationResult = {
    resultId: "result-001",
    signalCandidateId: candidate.candidateId,
    evaluationWindowId: window.windowId,
    evaluationInputId: input.inputId,
    status: "completed",
    outcomeSummary: "up",
    metrics,
    evaluatedAtUtc: "2026-04-15T10:45:00.000Z",
    limitations: ["no cross-exchange validation"],
    notes: "No clean trend continuation",
    createdAtUtc: "2026-04-15T10:45:00.000Z",
    updatedAtUtc: "2026-04-15T10:45:00.000Z"
  };

  const hypothesis: ResearchHypothesis = {
    hypothesisId: "hypothesis-001",
    title: "Breakout retest has positive asymmetry in trend regime",
    statement: "When setup-breakout-001 triggers in trend regime, MFE should exceed MAE on average.",
    relatedSetupIds: [setup.setupId],
    successCriteria: ["median MFE > median |MAE| after 50 evaluated samples"],
    status: "draft",
    createdAtUtc: "2026-04-14T10:00:00.000Z",
    updatedAtUtc: "2026-04-14T10:00:00.000Z"
  };

  const run: ResearchRun = {
    runId: "run-001",
    hypothesisId: hypothesis.hypothesisId,
    setupId: setup.setupId,
    candidateIds: [candidate.candidateId],
    evaluationWindowIds: [window.windowId],
    evaluationResultIds: [result.resultId],
    status: "planned",
    startedAtUtc: "2026-04-14T11:00:00.000Z",
    createdAtUtc: "2026-04-14T11:00:00.000Z",
    updatedAtUtc: "2026-04-14T11:00:00.000Z"
  };

  assert.equal(run.evaluationResultIds.length, 1);
  assert.equal(result.outcomeSummary, "up");
  assert.equal(result.status, "completed");
});

test("supports monitoring source and normalized event contracts", () => {
  const source: MarketDataSource = {
    sourceId: "source-primary",
    providerKind: "exchange_adapter",
    providerName: "example-exchange",
    providerInstance: "example-exchange-spot",
    marketScope: "spot",
    status: "active",
    symbolMappingMode: "provider_native",
    symbolMappingAssumptions: ["provider symbol BTCUSDT maps to canonical BTC-USDT"],
    reliabilityTier: "best_effort",
    reliabilityAssumptions: ["single-provider mode", "heartbeat monitored"],
    createdAtUtc: "2026-04-14T09:59:00.000Z",
    updatedAtUtc: "2026-04-14T09:59:00.000Z"
  };

  const event: PriceTickEvent = {
    eventId: "evt-price-001",
    sourceId: source.sourceId,
    symbolId: "BTC-USDT",
    eventType: "price_tick",
    eventTimestampUtc: "2026-04-14T10:30:00.000Z",
    payload: {
      price: 65000.12,
      bid: 64999.95,
      ask: 65000.2,
      tradeCount: 124
    },
    metadata: {
      schemaVersion: "monitoring.v1",
      normalizationVersion: "1.0.0",
      ingestedAtUtc: "2026-04-14T10:30:00.020Z",
      providerPayloadVersion: "spot-stream-v1",
      traceId: "trace-evt-price-001"
    }
  };

  const normalized: NormalizedMarketEvent = event;
  assert.equal(normalized.eventType, "price_tick");
  assert.equal(normalized.sourceId, source.sourceId);
});

test("supports research aggregation and setup comparison contracts", () => {
  const scope: AggregationScope = {
    setupDefinitionId: "setup-breakout-001",
    evaluationWindowId: "window-001",
    symbolScope: {
      kind: "single_symbol",
      symbolIds: ["BTC-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-04-01T00:00:00.000Z",
      endAtUtc: "2026-04-14T23:59:59.000Z"
    },
    hypothesisId: "hypothesis-001"
  };

  const input: ResearchAggregationInput = {
    inputId: "agg-input-001",
    setupDefinitionId: scope.setupDefinitionId,
    evaluationResultIds: ["result-001", "result-002"],
    scope,
    hypothesisId: "hypothesis-001",
    createdAtUtc: "2026-04-15T10:00:00.000Z",
    updatedAtUtc: "2026-04-15T10:00:00.000Z"
  };

  const metrics: AggregateMetrics = {
    totalEvaluatedCandidates: 12,
    completedEvaluationsCount: 10,
    invalidatedEvaluationsCount: 2,
    positiveOutcomeCount: 6,
    nonPositiveOutcomeCount: 4,
    averagePercentageMove: 1.14,
    averageAbsoluteMove: 742,
    averageFinalOutcomeScore: 0.2,
    averageMaxFavorableExcursion: 2.31,
    averageMaxAdverseExcursion: -1.41,
    simpleHitRate: 0.6
  };

  const aggregate: SetupAggregateResult = {
    aggregateId: "agg-001",
    setupDefinitionId: scope.setupDefinitionId,
    scope,
    includedEvaluationResultIds: input.evaluationResultIds,
    metrics,
    computationStatus: "completed",
    computedAtUtc: "2026-04-15T10:05:00.000Z",
    limitations: ["single-source evidence only"],
    createdAtUtc: "2026-04-15T10:05:00.000Z",
    updatedAtUtc: "2026-04-15T10:05:00.000Z"
  };

  const comparison: SetupComparison = {
    comparisonId: "cmp-001",
    setupDefinitionIds: ["setup-breakout-001", "setup-pullback-001"],
    scope: {
      evaluationWindowId: "window-001",
      symbolScope: scope.symbolScope,
      timeRange: scope.timeRange,
      hypothesisId: "hypothesis-001"
    },
    metricSnapshots: [
      {
        setupDefinitionId: "setup-breakout-001",
        aggregateResultId: aggregate.aggregateId,
        totalEvaluatedCandidates: 12,
        completedEvaluationsCount: 10,
        invalidatedEvaluationsCount: 2,
        averagePercentageMove: 1.14,
        averageAbsoluteMove: 742,
        averageFinalOutcomeScore: 0.2,
        averageMaxFavorableExcursion: 2.31,
        averageMaxAdverseExcursion: -1.41,
        simpleHitRate: 0.6
      },
      {
        setupDefinitionId: "setup-pullback-001",
        aggregateResultId: "agg-002",
        totalEvaluatedCandidates: 9,
        completedEvaluationsCount: 8,
        invalidatedEvaluationsCount: 1,
        averagePercentageMove: 0.73,
        averageAbsoluteMove: 401,
        averageFinalOutcomeScore: 0.1,
        averageMaxFavorableExcursion: 1.52,
        averageMaxAdverseExcursion: -1.02,
        simpleHitRate: 0.5
      }
    ],
    comparedAtUtc: "2026-04-15T10:10:00.000Z",
    limitations: ["no regime partitioning in first comparison model"],
    createdAtUtc: "2026-04-15T10:10:00.000Z",
    updatedAtUtc: "2026-04-15T10:10:00.000Z"
  };

  const evidenceLink: ResearchHypothesisEvidenceLink = {
    linkId: "link-001",
    hypothesisId: "hypothesis-001",
    aggregateResultId: aggregate.aggregateId,
    evidenceStatus: "supports",
    assessedAtUtc: "2026-04-15T10:15:00.000Z",
    rationale: "Positive hit rate and average move within the selected scope.",
    limitations: ["sample size remains small"],
    createdAtUtc: "2026-04-15T10:15:00.000Z",
    updatedAtUtc: "2026-04-15T10:15:00.000Z"
  };

  assert.equal(aggregate.computationStatus, "completed");
  assert.equal(comparison.metricSnapshots.length, 2);
  assert.equal(evidenceLink.evidenceStatus, "supports");
});

test("supports storage-boundary and persisted-entity contracts", () => {
  const identity: ProductEntityIdentity = {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: "setup-breakout-001",
    version: 3,
    parentEntityId: null,
    relatedEntityIds: ["hypothesis-001"]
  };

  const metadata: ProductRecordMetadata = {
    originRunId: "run-001",
    originTransitionId: "transition-001",
    createdBySource: "manual_curation",
    lastUpdatedBySource: "manual_curation",
    traceId: "trace-setup-001",
    sourceObservedAtUtc: null
  };

  const persisted: PersistedEntity = {
    identity,
    lifecycleStatus: "active",
    createdAtUtc: "2026-04-15T12:00:00.000Z",
    updatedAtUtc: "2026-04-15T12:00:00.000Z",
    metadata
  };

  assert.equal(persisted.identity.boundary, "product_domain");
  assert.equal(persisted.identity.version, 3);
  assert.equal(persisted.metadata.originRunId, "run-001");
});
