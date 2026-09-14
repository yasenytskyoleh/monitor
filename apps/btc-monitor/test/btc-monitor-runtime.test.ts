import assert from "node:assert/strict";
import test from "node:test";

import type {
  CandleClosedEvent,
  MonitoredSymbol,
  ProductRecordMetadata,
  SetupAggregateResult,
  SetupDefinition,
  SetupDefinitionRevision
} from "@monitor/domain-model";
import {
  InMemoryMonitoredSymbolRepository,
  InMemoryPatternNotificationRecordRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySetupRevisionActivationRecordRepository,
  InMemorySignalCandidateRepository
} from "@monitor/domain-model";
import type { ClosedCandleFeed, ClosedCandleFeedSink } from "@monitor/pattern-detection";

import { createBtcMonitorRuntime } from "../src/btc-monitor-runtime.js";

const START_TIME_MS = Date.parse("2026-09-12T00:00:00.000Z");
const FIVE_MINUTES_MS = 300_000;
const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-09-12T00:00:00.000Z"
};

const candle = (index: number, close = 99, high = 100): CandleClosedEvent => {
  const openTimeMs = START_TIME_MS + index * FIVE_MINUTES_MS;
  return {
    eventId: `fixture:5m:${index}`,
    sourceId: "fixture-source",
    symbolId: "BTC-USDT",
    eventType: "candle_closed",
    eventTimestampUtc: new Date(openTimeMs + FIVE_MINUTES_MS - 1).toISOString(),
    payload: {
      timeframe: "5m",
      open: 98,
      high,
      low: 97,
      close,
      volume: 10,
      openTimeUtc: new Date(openTimeMs).toISOString(),
      closeTimeUtc: new Date(openTimeMs + FIVE_MINUTES_MS - 1).toISOString()
    },
    metadata: {
      schemaVersion: "monitoring.v1",
      normalizationVersion: "fixture.v1",
      ingestedAtUtc: new Date(openTimeMs).toISOString(),
      providerPayloadVersion: null,
      traceId: null
    }
  };
};

class FixtureCandleFeed implements ClosedCandleFeed {
  range: { startTimeUtc: string; endTimeUtc?: string } | undefined;
  sink: ClosedCandleFeedSink | undefined;
  stopped = false;

  async startClosedCandleFeed(
    range: { startTimeUtc: string; endTimeUtc?: string },
    sink: ClosedCandleFeedSink
  ): Promise<{ stop(): Promise<void> }> {
    this.range = range;
    this.sink = sink;
    return {
      stop: async (): Promise<void> => {
        this.stopped = true;
      }
    };
  }

  async emit(event: CandleClosedEvent): Promise<void> {
    await this.sink?.onCandle(event);
  }
}

const seedRepositories = async (): Promise<{
  monitoredSymbolRepository: InMemoryMonitoredSymbolRepository;
  patternNotificationRecordRepository: InMemoryPatternNotificationRecordRepository;
  setupAggregateResultRepository: InMemorySetupAggregateResultRepository;
  setupDefinitionRepository: InMemorySetupDefinitionRepository;
  setupDefinitionRevisionRepository: InMemorySetupDefinitionRevisionRepository;
  setupRevisionActivationRecordRepository: InMemorySetupRevisionActivationRecordRepository;
  signalCandidateRepository: InMemorySignalCandidateRepository;
}> => {
  const monitoredSymbolRepository = new InMemoryMonitoredSymbolRepository();
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const setupRevisionActivationRecordRepository = new InMemorySetupRevisionActivationRecordRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const patternNotificationRecordRepository = new InMemoryPatternNotificationRecordRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const definition: SetupDefinition = {
    id: "setup-btc-breakout",
    name: "BTC breakout",
    description: "Five-minute breakout",
    status: "active",
    measurableConditions: ["Close above the previous range high"],
    evaluationAssumptions: ["Evaluate follow-through"],
    invalidationAssumptions: ["Close below range"],
    createdAt: metadata.sourceObservedAtUtc ?? "2026-09-12T00:00:00.000Z",
    updatedAt: metadata.sourceObservedAtUtc ?? "2026-09-12T00:00:00.000Z"
  };
  const revision: SetupDefinitionRevision = {
    id: "revision-btc-breakout-1",
    setupDefinitionId: definition.id,
    versionInfo: {
      setupFamilyId: "family-btc-breakout",
      revisionId: "revision-btc-breakout-1",
      version: 1
    },
    revisionReason: "Initial breakout rule",
    revisionStatus: "accepted",
    changedFieldsSummary: "Initial revision",
    createdBy: "fixture",
    createdAt: definition.createdAt,
    sourceSetupRefinementRequestId: "fixture-refinement",
    updatedAt: definition.updatedAt
  };
  const symbol: MonitoredSymbol = {
    symbolId: "BTC-USDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    displayName: "BTC/USDT",
    marketScope: "spot",
    status: "active",
    providerHint: "unknown",
    tags: [],
    sourceBindings: [],
    createdAtUtc: definition.createdAt,
    updatedAtUtc: definition.updatedAt
  };
  await Promise.all([
    setupDefinitionRepository.create({ definition, metadata }),
    setupDefinitionRevisionRepository.create({ revision, metadata }),
    monitoredSymbolRepository.create({ symbol, metadata })
  ]);
  return {
    monitoredSymbolRepository,
    patternNotificationRecordRepository,
    setupAggregateResultRepository,
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository,
    signalCandidateRepository
  };
};

const aggregate: SetupAggregateResult = {
  id: "aggregate-btc-breakout-window-24h",
  setupDefinitionId: "setup-btc-breakout",
  aggregationScope: {
    setupDefinitionId: "setup-btc-breakout",
    evaluationWindowId: "window-24h",
    symbolScope: { kind: "single_symbol", symbolIds: ["BTC-USDT"] },
    timeRange: {
      startAtUtc: "1970-01-01T00:00:00.000Z",
      endAtUtc: "9999-12-31T23:59:59.999Z"
    }
  },
  status: "completed",
  totalCandidates: 40,
  completedEvaluations: 40,
  invalidatedEvaluations: 0,
  averagePercentageMove: 1.25,
  averageAbsoluteMove: 850,
  averageFinalOutcome: 0.5,
  averageMaxFavorableExcursion: 1_200,
  averageMaxAdverseExcursion: -350,
  positiveOutcomeCount: 30,
  computedAt: "2026-09-12T00:00:00.000Z",
  createdAt: "2026-09-12T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z"
};

test("runs the configured candle feed through active setup resolution and durable candidate handoff", async () => {
  const repositories = await seedRepositories();
  await repositories.setupAggregateResultRepository.create({ aggregate, metadata });
  const feed = new FixtureCandleFeed();
  const detectedEventIds: string[] = [];
  const runtime = createBtcMonitorRuntime({
    candleFeed: feed,
    configuration: {
      setupDefinitionId: "setup-btc-breakout",
      monitoredSymbolId: "BTC-USDT",
      backfillStartTimeUtc: "2026-09-11T00:00:00.000Z"
    },
    repositories,
    onDetection(event): void {
      detectedEventIds.push(event.candle.eventId);
    }
  });

  const subscription = await runtime.start();
  for (let index = 0; index < 20; index += 1) await feed.emit(candle(index));
  await feed.emit(candle(20, 101, 102));

  const candidate = await repositories.signalCandidateRepository.getById(
    "candidate-detection-setup-btc-breakout-revision-btc-breakout-1-bullish_close_breakout_v1-fixture:5m:20"
  );
  assert.deepEqual(feed.range, { startTimeUtc: "2026-09-11T00:00:00.000Z" });
  assert.equal(candidate?.setupRevisionId, "revision-btc-breakout-1");
  assert.deepEqual(detectedEventIds, ["fixture:5m:20"]);
  const notifications = await repositories.patternNotificationRecordRepository
    .listByDeliveryStatus(["pending_delivery"], 10);
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0] && {
    signalCandidateId: notifications[0].signalCandidateId,
    setupAggregateResultId: notifications[0].setupAggregateResultId,
    currentPrice: notifications[0].currentPrice,
    deliveryStatus: notifications[0].deliveryStatus
  }, {
    signalCandidateId: candidate?.id,
    setupAggregateResultId: aggregate.id,
    currentPrice: 101,
    deliveryStatus: "pending_delivery"
  });

  await subscription.stop();
  assert.equal(feed.stopped, true);
});

test("does not retain a notification when exact BTC 24-hour evidence is unavailable", async () => {
  const repositories = await seedRepositories();
  const feed = new FixtureCandleFeed();
  const notificationReasons: string[] = [];
  const runtime = createBtcMonitorRuntime({
    candleFeed: feed,
    configuration: {
      setupDefinitionId: "setup-btc-breakout",
      monitoredSymbolId: "BTC-USDT",
      backfillStartTimeUtc: "2026-09-11T00:00:00.000Z"
    },
    repositories,
    onNotification(outcome): void {
      if (outcome.eligibility.status === "ineligible") notificationReasons.push(outcome.eligibility.reason);
    }
  });

  await runtime.start();
  for (let index = 0; index < 20; index += 1) await feed.emit(candle(index));
  await feed.emit(candle(20, 101, 102));

  assert.deepEqual(notificationReasons, ["setup_aggregate_result_unavailable"]);
  assert.equal(
    (await repositories.patternNotificationRecordRepository.listByDeliveryStatus(["pending_delivery"], 10)).length,
    0
  );
});

test("uses the revision activated for the historical candle rather than the configured revision", async () => {
  const repositories = await seedRepositories();
  const activatedDefinition: SetupDefinition = {
    id: "setup-btc-breakout-v2",
    name: "BTC breakout v2",
    description: "Refined five-minute breakout",
    status: "active",
    measurableConditions: ["Close above the refined range high"],
    evaluationAssumptions: ["Evaluate follow-through"],
    invalidationAssumptions: ["Close below range"],
    createdAt: metadata.sourceObservedAtUtc ?? "2026-09-12T00:00:00.000Z",
    updatedAt: metadata.sourceObservedAtUtc ?? "2026-09-12T00:00:00.000Z"
  };
  const activatedRevision: SetupDefinitionRevision = {
    id: "revision-btc-breakout-2",
    setupDefinitionId: activatedDefinition.id,
    previousSetupDefinitionId: "setup-btc-breakout",
    versionInfo: {
      setupFamilyId: "family-btc-breakout",
      revisionId: "revision-btc-breakout-2",
      version: 2,
      previousRevisionId: "revision-btc-breakout-1"
    },
    revisionReason: "Refine the breakout rule",
    revisionStatus: "accepted",
    changedFieldsSummary: "Refined breakout threshold",
    createdBy: "fixture",
    createdAt: activatedDefinition.createdAt,
    sourceSetupRefinementRequestId: "fixture-refinement-v2",
    updatedAt: activatedDefinition.updatedAt
  };
  await repositories.setupDefinitionRepository.create({ definition: activatedDefinition, metadata });
  await repositories.setupDefinitionRevisionRepository.create({ revision: activatedRevision, metadata });
  await repositories.setupRevisionActivationRecordRepository.create({
    activation: {
      id: "activation-btc-breakout-v2",
      setupFamilyId: "family-btc-breakout",
      targetRevisionId: activatedRevision.id,
      targetSetupDefinitionId: activatedDefinition.id,
      previousRevisionId: "revision-btc-breakout-1",
      previousSetupDefinitionId: "setup-btc-breakout",
      activatedBy: "fixture",
      activatedAt: "2026-09-12T00:00:00.000Z",
      activationOutcome: "superseded_previous",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z"
    },
    metadata
  });
  const feed = new FixtureCandleFeed();
  const runtime = createBtcMonitorRuntime({
    candleFeed: feed,
    configuration: {
      setupDefinitionId: "setup-btc-breakout",
      monitoredSymbolId: "BTC-USDT",
      backfillStartTimeUtc: "2026-09-11T00:00:00.000Z"
    },
    repositories
  });

  await runtime.start();
  for (let index = 0; index < 20; index += 1) await feed.emit(candle(index));
  await feed.emit(candle(20, 101, 102));

  const candidate = await repositories.signalCandidateRepository.getById(
    "candidate-detection-setup-btc-breakout-revision-btc-breakout-2-bullish_close_breakout_v1-fixture:5m:20"
  );
  assert.equal(candidate?.setupDefinitionId, activatedDefinition.id);
  assert.equal(candidate?.setupRevisionId, activatedRevision.id);
});
