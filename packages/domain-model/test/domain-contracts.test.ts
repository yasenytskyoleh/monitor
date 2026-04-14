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
  FEEDBACK_DECISION_RESULT_STATUSES,
  FIRST_CLASS_PERSISTED_ENTITY_PROFILES,
  FIRST_PERSISTED_PRODUCT_SLICE,
  HYPOTHESIS_EVIDENCE_STATUSES,
  HYPOTHESIS_EVIDENCE_UPDATE_STATUSES,
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
  PRODUCT_SERVICE_NAMES,
  PRODUCT_WRITE_PATH_OWNERSHIP,
  RESEARCH_FEEDBACK_DECISION_ACTIONS,
  RESEARCH_FEEDBACK_DECISION_STATUSES,
  RESEARCH_HYPOTHESIS_STATUSES,
  RUNTIME_EVIDENCE_ARTIFACT_TYPES,
  SETUP_DEFINITION_STATUSES,
  SIGNAL_CANDIDATE_STATUSES,
  STORAGE_BOUNDARIES,
  TIMEFRAME_LABELS,
  type AggregationScope,
  type EvaluationInput,
  type EvaluationResult,
  type EvaluationWindow,
  type MarketDataSource,
  type MonitoredSymbol,
  type NormalizedMarketEvent,
  type PersistedEntity,
  type PriceTickEvent,
  type ProductEntityIdentity,
  type ProductRecordMetadata,
  type ResearchHypothesisRepository,
  type ResearchFeedbackDecision,
  type ResearchAggregationInput,
  type ResearchHypothesisEvidenceLink,
  type ResearchHypothesis,
  type ResearchService,
  type ResearchRun,
  type SetupDefinitionRepository,
  type SetupDefinitionService,
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
  assert.deepEqual(HYPOTHESIS_EVIDENCE_UPDATE_STATUSES, [
    "updated",
    "rejected_validation",
    "rejected_lifecycle",
    "rejected_linkage",
    "failed"
  ]);
  assert.deepEqual(FEEDBACK_DECISION_RESULT_STATUSES, [
    "recorded",
    "rejected_validation",
    "rejected_linkage",
    "failed"
  ]);
  assert.deepEqual(RESEARCH_FEEDBACK_DECISION_ACTIONS, [
    "keep_active",
    "refine_definition",
    "pause_setup",
    "archive_setup",
    "manual_review_required"
  ]);
  assert.deepEqual(RESEARCH_FEEDBACK_DECISION_STATUSES, [
    "proposed",
    "reviewed",
    "accepted",
    "rejected"
  ]);
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
    "setup_aggregate_result",
    "research_feedback_decision"
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
  assert.deepEqual(PRODUCT_SERVICE_NAMES, [
    "monitoring_catalog_service",
    "setup_definition_service",
    "signal_candidate_service",
    "evaluation_service",
    "research_service",
    "research_aggregation_service"
  ]);
  assert.deepEqual(FIRST_PERSISTED_PRODUCT_SLICE, ["setup_definition", "research_hypothesis"]);
  assert.equal(PRODUCT_WRITE_PATH_OWNERSHIP.length, 7);
  assert.deepEqual(PERSISTED_ENTITY_LIFECYCLE_STATUSES, ["active", "archived"]);
  assert.equal(DEFAULT_STORAGE_TECHNOLOGY_DIRECTION.productDomain, "relational_planned");
  assert.equal(FIRST_CLASS_PERSISTED_ENTITY_PROFILES.length, 7);
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
    id: "setup-breakout-001",
    name: "Breakout Retest",
    description: "Retest after breakout with volume confirmation",
    status: "active",
    measurableConditions: ["close_above_range_high on 4h"],
    evaluationAssumptions: ["evaluate over fixed 24h horizon"],
    invalidationAssumptions: ["discard if immediate breakdown below retest level"],
    createdAt: "2026-04-14T10:00:00.000Z",
    updatedAt: "2026-04-14T10:00:00.000Z"
  };

  const candidate: SignalCandidate = {
    id: "candidate-001",
    setupDefinitionId: setup.id,
    monitoredSymbolId: symbol.symbolId,
    detectedAt: "2026-04-14T10:30:00.000Z",
    status: "detected",
    evidenceSummary: "range break with elevated volume",
    createdAt: "2026-04-14T10:30:00.000Z",
    updatedAt: "2026-04-14T10:30:00.000Z"
  };

  const window: EvaluationWindow = {
    windowId: "window-001",
    signalCandidateId: candidate.id,
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
    signalCandidateId: candidate.id,
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

  const result: EvaluationResult = {
    id: "result-001",
    signalCandidateId: candidate.id,
    evaluationWindowId: window.windowId,
    status: "completed",
    referencePrice: 65000,
    finalPrice: 65800,
    highInWindow: 66400,
    lowInWindow: 64100,
    absoluteMove: 800,
    percentageMove: 1.23,
    maxFavorableExcursion: 2.15,
    maxAdverseExcursion: -1.38,
    evaluatedAt: "2026-04-15T10:45:00.000Z",
    notes: "No clean trend continuation",
    createdAt: "2026-04-15T10:45:00.000Z",
    updatedAt: "2026-04-15T10:45:00.000Z"
  };

  const hypothesis: ResearchHypothesis = {
    id: "hypothesis-001",
    title: "Breakout retest has positive asymmetry in trend regime",
    description: "When setup-breakout-001 triggers in trend regime, MFE should exceed MAE on average.",
    relatedSetupDefinitionIds: [setup.id],
    assumptions: ["median MFE > median |MAE| after 50 evaluated samples"],
    notes: [],
    status: "draft",
    createdAt: "2026-04-14T10:00:00.000Z",
    updatedAt: "2026-04-14T10:00:00.000Z"
  };

  const run: ResearchRun = {
    runId: "run-001",
    hypothesisId: hypothesis.id,
    setupId: setup.id,
    candidateIds: [candidate.id],
    evaluationWindowIds: [window.windowId],
    evaluationResultIds: [result.id],
    status: "planned",
    startedAtUtc: "2026-04-14T11:00:00.000Z",
    createdAtUtc: "2026-04-14T11:00:00.000Z",
    updatedAtUtc: "2026-04-14T11:00:00.000Z"
  };

  assert.equal(run.evaluationResultIds.length, 1);
  assert.equal(result.absoluteMove, 800);
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
    createdAt: "2026-04-15T10:00:00.000Z",
    updatedAt: "2026-04-15T10:00:00.000Z"
  };

  const aggregate: SetupAggregateResult = {
    id: "agg-001",
    setupDefinitionId: scope.setupDefinitionId,
    researchHypothesisId: "hypothesis-001",
    aggregationScope: scope,
    status: "completed",
    totalCandidates: 12,
    completedEvaluations: 10,
    invalidatedEvaluations: 2,
    averagePercentageMove: 1.14,
    averageAbsoluteMove: 742,
    averageFinalOutcome: 0.2,
    averageMaxFavorableExcursion: 2.31,
    averageMaxAdverseExcursion: -1.41,
    positiveOutcomeCount: 6,
    computedAt: "2026-04-15T10:05:00.000Z",
    notes: "single-source evidence only",
    createdAt: "2026-04-15T10:05:00.000Z",
    updatedAt: "2026-04-15T10:05:00.000Z"
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
        aggregateResultId: aggregate.id,
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
    aggregateResultId: aggregate.id,
    evidenceStatus: "supports",
    assessedAtUtc: "2026-04-15T10:15:00.000Z",
    rationale: "Positive hit rate and average move within the selected scope.",
    limitations: ["sample size remains small"],
    createdAtUtc: "2026-04-15T10:15:00.000Z",
    updatedAtUtc: "2026-04-15T10:15:00.000Z"
  };

  const feedbackDecision: ResearchFeedbackDecision = {
    id: "feedback-001",
    setupDefinitionId: scope.setupDefinitionId,
    researchHypothesisId: "hypothesis-001",
    setupAggregateResultId: aggregate.id,
    evidenceStatus: "supports",
    recommendedAction: "keep_active",
    rationaleSummary: "Evidence supports the hypothesis and setup remains valid.",
    decisionStatus: "proposed",
    requiresManualReview: true,
    evidenceSummary: "aggregate evidence supports hypothesis",
    createdAt: "2026-04-15T10:20:00.000Z",
    updatedAt: "2026-04-15T10:20:00.000Z"
  };

  assert.equal(aggregate.status, "completed");
  assert.equal(comparison.metricSnapshots.length, 2);
  assert.equal(evidenceLink.evidenceStatus, "supports");
  assert.equal(feedbackDecision.recommendedAction, "keep_active");
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

test("supports repository and service boundary contracts", async () => {
  const setupRepository: SetupDefinitionRepository = {
    getById: async () => null,
    listByStatus: async () => [],
    create: async (request) => request.definition,
    update: async (request) => request.definition,
    updateStatus: async () => null
  };

  const hypothesisRepository: ResearchHypothesisRepository = {
    getById: async () => null,
    listByStatus: async () => [],
    create: async (request) => request.hypothesis,
    update: async (request) => request.hypothesis,
    updateStatus: async () => null
  };

  const setupService: SetupDefinitionService = {
    createSetupDefinition: async (request) =>
      setupRepository.create({ definition: request.definition, metadata: request.metadata }),
    updateSetupDefinition: async (request) =>
      setupRepository.update({
        definition: request.definition,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      }),
    activateSetupDefinition: async () => null,
    archiveSetupDefinition: async () => null
  };

  const researchService: ResearchService = {
    createResearchHypothesis: async (request) =>
      hypothesisRepository.create({ hypothesis: request.hypothesis, metadata: request.metadata }),
    updateResearchHypothesis: async (request) =>
      hypothesisRepository.update({
        hypothesis: request.hypothesis,
        metadata: request.metadata,
        expectedVersion: request.expectedVersion
      }),
    updateResearchHypothesisStatus: async () => null,
    attachHypothesisToSetupDefinitions: async () => null,
    updateHypothesisEvidence: async () => null,
    reviewSetupFromEvidence: async () => null
  };

  const setup = await setupService.createSetupDefinition({
    definition: {
      id: "setup-service-001",
      name: "Service setup",
      description: "Repository/service boundary test setup",
      status: "draft",
      measurableConditions: ["exists"],
      evaluationAssumptions: [],
      invalidationAssumptions: [],
      createdAt: "2026-04-16T10:00:00.000Z",
      updatedAt: "2026-04-16T10:00:00.000Z"
    },
    metadata: {
      originRunId: null,
      originTransitionId: null,
      createdBySource: "manual_curation",
      lastUpdatedBySource: "manual_curation",
      traceId: "trace-service-setup",
      sourceObservedAtUtc: null
    }
  });

  const hypothesis = await researchService.createResearchHypothesis({
    hypothesis: {
      id: "hypothesis-service-001",
      title: "Service hypothesis",
      description: "Service boundary test hypothesis",
      relatedSetupDefinitionIds: [setup.id],
      assumptions: ["exists"],
      notes: [],
      status: "draft",
      createdAt: "2026-04-16T10:00:00.000Z",
      updatedAt: "2026-04-16T10:00:00.000Z"
    },
    metadata: {
      originRunId: null,
      originTransitionId: null,
      createdBySource: "manual_curation",
      lastUpdatedBySource: "manual_curation",
      traceId: "trace-service-hypothesis",
      sourceObservedAtUtc: null
    }
  });

  assert.equal(setup.id, "setup-service-001");
  assert.equal(hypothesis.id, "hypothesis-service-001");
});
