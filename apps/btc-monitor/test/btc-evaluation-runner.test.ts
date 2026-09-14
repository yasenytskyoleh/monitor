import assert from "node:assert/strict";
import test from "node:test";

import type {
  CandleClosedEvent,
  MonitoredSymbol,
  ProductRecordMetadata,
  SetupDefinition
} from "@monitor/domain-model";
import {
  InMemoryEvaluationResultRepository,
  InMemoryMonitoredSymbolRepository,
  InMemoryResearchHypothesisRepository,
  InMemoryResearchRunRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySignalCandidateRepository,
  createSignalCandidateService
} from "@monitor/domain-model";

import { createBtcEvaluationRunner } from "../src/btc-evaluation-runner.js";

const START_TIME_MS = Date.parse("2026-09-01T00:00:00.000Z");
const FIVE_MINUTES_MS = 300_000;
const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-09-01T00:00:00.000Z"
};

class FailOnceSetupAggregateResultRepository extends InMemorySetupAggregateResultRepository {
  private shouldFail = true;

  override async create(request: Parameters<InMemorySetupAggregateResultRepository["create"]>[0]) {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error("temporary aggregate persistence failure");
    }
    return super.create(request);
  }
}

const candle = (index: number): CandleClosedEvent => {
  const openTimeMs = START_TIME_MS + index * FIVE_MINUTES_MS;
  const close = index === 288 ? 103 : 100;
  return {
    eventId: `fixture:5m:${index}`,
    sourceId: "fixture-source",
    symbolId: "BTC-USDT",
    eventType: "candle_closed",
    eventTimestampUtc: new Date(openTimeMs + FIVE_MINUTES_MS - 1).toISOString(),
    payload: {
      timeframe: "5m",
      open: 100,
      high: index === 10 ? 110 : Math.max(101, close),
      low: index === 20 ? 90 : Math.min(99, close),
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

const createFixture = async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const monitoredSymbolRepository = new InMemoryMonitoredSymbolRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const setupAggregateResultRepository = new InMemorySetupAggregateResultRepository();
  const setupDefinition: SetupDefinition = {
    id: "setup-btc-evaluation",
    name: "BTC evaluation",
    description: "fixture",
    status: "active",
    measurableConditions: ["breakout"],
    evaluationAssumptions: ["24h"],
    invalidationAssumptions: ["none"],
    createdAt: metadata.sourceObservedAtUtc ?? "2026-09-01T00:00:00.000Z",
    updatedAt: metadata.sourceObservedAtUtc ?? "2026-09-01T00:00:00.000Z"
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
    createdAtUtc: setupDefinition.createdAt,
    updatedAtUtc: setupDefinition.updatedAt
  };
  await setupDefinitionRepository.create({ definition: setupDefinition, metadata });
  await monitoredSymbolRepository.create({ symbol, metadata });
  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository
  });
  const detection = candle(0);
  await signalCandidateService.createSignalCandidate({
    candidate: {
      id: "candidate-due",
      setupDefinitionId: setupDefinition.id,
      setupRevisionId: "revision-btc-evaluation",
      monitoredSymbolId: symbol.symbolId,
      status: "detected",
      detectedAt: detection.eventTimestampUtc,
      evidenceSummary: "fixture breakout",
      createdAt: detection.eventTimestampUtc,
      updatedAt: detection.eventTimestampUtc
    },
    metadata
  });
  return {
    repositories: {
      setupDefinitionRepository,
      setupDefinitionRevisionRepository: new InMemorySetupDefinitionRevisionRepository(),
      monitoredSymbolRepository,
      signalCandidateRepository,
      evaluationResultRepository,
      setupAggregateResultRepository,
      researchHypothesisRepository: new InMemoryResearchHypothesisRepository(),
      researchRunRepository: new InMemoryResearchRunRepository()
    },
    detection
  };
};

test("evaluates a closed candidate window and refreshes its historical aggregate", async () => {
  const fixture = await createFixture();
  const requests: { startTimeUtc: string; endTimeUtc: string }[] = [];
  const results = await createBtcEvaluationRunner({
    repositories: fixture.repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    now: () => new Date(START_TIME_MS + 24 * 60 * 60 * 1_000 + FIVE_MINUTES_MS),
    candleSource: {
      async backfillClosedCandles(range) {
        requests.push(range);
        return Array.from({ length: 289 }, (_, index) => candle(index));
      }
    }
  }).run();

  const candidate = await fixture.repositories.signalCandidateRepository.getById("candidate-due");
  const evaluations = await fixture.repositories.evaluationResultRepository.listBySignalCandidateId("candidate-due");
  const aggregates = await fixture.repositories.setupAggregateResultRepository.listBySetupDefinitionId("setup-btc-evaluation");
  assert.equal(results[0]?.status, "completed");
  assert.equal(candidate?.status, "evaluated");
  assert.equal(evaluations[0]?.status, "completed");
  assert.equal(aggregates[0]?.completedEvaluations, 1);
  assert.equal(aggregates[0]?.averagePercentageMove, 3);
  assert.deepEqual(requests, [{
    startTimeUtc: "2026-09-01T00:00:00.000Z",
    endTimeUtc: "2026-09-02T00:04:59.999Z"
  }]);
});

test("leaves candidates with an incomplete observation window untouched", async () => {
  const fixture = await createFixture();
  const results = await createBtcEvaluationRunner({
    repositories: fixture.repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    now: () => new Date(START_TIME_MS + FIVE_MINUTES_MS),
    candleSource: { async backfillClosedCandles() { throw new Error("must not fetch"); } }
  }).run();

  assert.deepEqual(results, [{ candidateId: "candidate-due", status: "not_due" }]);
  assert.equal((await fixture.repositories.signalCandidateRepository.getById("candidate-due"))?.status, "detected");
});

test("limits a one-shot evaluation run to its configured batch size", async () => {
  const fixture = await createFixture();
  await fixture.repositories.signalCandidateRepository.create({
    candidate: {
      id: "candidate-deferred",
      setupDefinitionId: "setup-btc-evaluation",
      setupRevisionId: "revision-btc-evaluation",
      monitoredSymbolId: "BTC-USDT",
      status: "detected",
      detectedAt: fixture.detection.eventTimestampUtc,
      evidenceSummary: "deferred fixture",
      createdAt: fixture.detection.eventTimestampUtc,
      updatedAt: fixture.detection.eventTimestampUtc
    },
    metadata
  });
  const results = await createBtcEvaluationRunner({
    repositories: fixture.repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    maxCandidates: 1,
    now: () => new Date(START_TIME_MS + 24 * 60 * 60 * 1_000 + FIVE_MINUTES_MS),
    candleSource: {
      async backfillClosedCandles() {
        return Array.from({ length: 289 }, (_, index) => candle(index));
      }
    }
  }).run();

  assert.deepEqual(results.map((result) => result.candidateId), ["candidate-due"]);
  assert.equal((await fixture.repositories.signalCandidateRepository.getById("candidate-deferred"))?.status, "detected");
});

test("does not fetch candles for a discarded candidate without a completed evaluation", async () => {
  const fixture = await createFixture();
  await fixture.repositories.signalCandidateRepository.updateStatus({
    signalCandidateId: "candidate-due",
    status: "discarded",
    metadata,
    expectedVersion: null
  });
  const results = await createBtcEvaluationRunner({
    repositories: fixture.repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    now: () => new Date(START_TIME_MS + 24 * 60 * 60 * 1_000 + FIVE_MINUTES_MS),
    candleSource: { async backfillClosedCandles() { throw new Error("must not fetch"); } }
  }).run();

  assert.deepEqual(results, [{
    candidateId: "candidate-due",
    status: "skipped",
    reason: "candidate is discarded"
  }]);
});

test("does not fetch or mutate candidates outside the configured BTC setup scope", async () => {
  const fixture = await createFixture();
  await fixture.repositories.signalCandidateRepository.create({
    candidate: {
      id: "candidate-foreign-setup",
      setupDefinitionId: "setup-foreign",
      setupRevisionId: "revision-foreign",
      monitoredSymbolId: "BTC-USDT",
      status: "detected",
      detectedAt: fixture.detection.eventTimestampUtc,
      evidenceSummary: "foreign fixture",
      createdAt: fixture.detection.eventTimestampUtc,
      updatedAt: fixture.detection.eventTimestampUtc
    },
    metadata
  });
  await fixture.repositories.signalCandidateRepository.create({
    candidate: {
      id: "candidate-foreign-symbol",
      setupDefinitionId: "setup-btc-evaluation",
      setupRevisionId: "revision-btc-evaluation",
      monitoredSymbolId: "ETH-USDT",
      status: "detected",
      detectedAt: fixture.detection.eventTimestampUtc,
      evidenceSummary: "foreign fixture",
      createdAt: fixture.detection.eventTimestampUtc,
      updatedAt: fixture.detection.eventTimestampUtc
    },
    metadata
  });
  const results = await createBtcEvaluationRunner({
    repositories: fixture.repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    now: () => new Date(START_TIME_MS + FIVE_MINUTES_MS),
    candleSource: { async backfillClosedCandles() { throw new Error("must not fetch"); } }
  }).run();

  assert.deepEqual(results, [{ candidateId: "candidate-due", status: "not_due" }]);
  assert.equal((await fixture.repositories.signalCandidateRepository.getById("candidate-foreign-setup"))?.status, "detected");
  assert.equal((await fixture.repositories.signalCandidateRepository.getById("candidate-foreign-symbol"))?.status, "detected");
});

test("retries aggregation after evaluation has already finalized the candidate", async () => {
  const fixture = await createFixture();
  const failingRepository = new FailOnceSetupAggregateResultRepository();
  const repositories = { ...fixture.repositories, setupAggregateResultRepository: failingRepository };
  let fetchCount = 0;
  const runner = createBtcEvaluationRunner({
    repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    now: () => new Date(START_TIME_MS + 24 * 60 * 60 * 1_000 + FIVE_MINUTES_MS),
    candleSource: {
      async backfillClosedCandles() {
        fetchCount += 1;
        return Array.from({ length: 289 }, (_, index) => candle(index));
      }
    }
  });

  const first = await runner.run();
  const second = await runner.run();

  assert.equal(first[0]?.status, "failed");
  assert.equal(second[0]?.status, "completed");
  assert.equal(fetchCount, 1);
  assert.equal((await failingRepository.listBySetupDefinitionId("setup-btc-evaluation"))[0]?.completedEvaluations, 1);
});

test("retries aggregation when a completed evaluation is stranded on a discarded candidate", async () => {
  const fixture = await createFixture();
  const failingRepository = new FailOnceSetupAggregateResultRepository();
  const repositories = { ...fixture.repositories, setupAggregateResultRepository: failingRepository };
  let fetchCount = 0;
  const runner = createBtcEvaluationRunner({
    repositories,
    setupDefinitionId: "setup-btc-evaluation",
    monitoredSymbolId: "BTC-USDT",
    now: () => new Date(START_TIME_MS + 24 * 60 * 60 * 1_000 + FIVE_MINUTES_MS),
    candleSource: {
      async backfillClosedCandles() {
        fetchCount += 1;
        return Array.from({ length: 289 }, (_, index) => candle(index));
      }
    }
  });

  const first = await runner.run();
  await fixture.repositories.signalCandidateRepository.updateStatus({
    signalCandidateId: "candidate-due",
    status: "discarded",
    metadata,
    expectedVersion: null
  });
  const second = await runner.run();

  assert.equal(first[0]?.status, "failed");
  assert.equal(second[0]?.status, "completed");
  assert.equal(fetchCount, 1);
  assert.equal((await failingRepository.listBySetupDefinitionId("setup-btc-evaluation"))[0]?.completedEvaluations, 1);
});
