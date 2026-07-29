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
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  createEvaluationService,
  createSignalCandidateService,
  createSignalCandidateToEvaluationHandoff
} from "@monitor/domain-model";

import {
  CANDLE_EVALUATION_OBSERVATION_COUNT,
  CANDLE_EVALUATION_WINDOW_ID,
  createClosedCandleEvaluationRuntime
} from "../src/index.js";

const START_TIME_MS = Date.parse("2026-07-29T00:00:00.000Z");
const FIVE_MINUTES_MS = 300_000;

type CandleOptions = {
  close?: number;
  eventId?: string;
  high?: number;
  low?: number;
  sourceId?: string;
  symbolId?: string;
  timeframe?: "1m" | "5m";
};

const candleAt = (openTimeMs: number, options: CandleOptions = {}): CandleClosedEvent => {
  const timeframe = options.timeframe ?? "5m";
  const intervalMs = timeframe === "5m" ? FIVE_MINUTES_MS : 60_000;
  const close = options.close ?? 100;
  const high = options.high ?? Math.max(close, 101);
  const low = options.low ?? Math.min(close, 99);
  const closeTimeMs = openTimeMs + intervalMs - 1;
  return {
    eventId: options.eventId ?? `fixture:${timeframe}:${openTimeMs}`,
    sourceId: options.sourceId ?? "fixture-source",
    symbolId: options.symbolId ?? "BTC-USDT",
    eventType: "candle_closed",
    eventTimestampUtc: new Date(closeTimeMs).toISOString(),
    payload: {
      timeframe,
      open: 100,
      high,
      low,
      close,
      volume: 10,
      openTimeUtc: new Date(openTimeMs).toISOString(),
      closeTimeUtc: new Date(closeTimeMs).toISOString()
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

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: null,
  sourceObservedAtUtc: "2026-07-29T00:00:00.000Z"
};

const setupDefinition: SetupDefinition = {
  id: "setup-evaluation-001",
  name: "Evaluation setup",
  description: "Closed-candle evaluation fixture",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["evaluate for 24 hours"],
  invalidationAssumptions: ["none"],
  createdAt: metadata.sourceObservedAtUtc ?? "2026-07-29T00:00:00.000Z",
  updatedAt: metadata.sourceObservedAtUtc ?? "2026-07-29T00:00:00.000Z"
};

const monitoredSymbol: MonitoredSymbol = {
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

const createFixture = async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const evaluationResultRepository = new InMemoryEvaluationResultRepository();
  const detectionCandle = candleAt(START_TIME_MS, { high: 101, low: 99, close: 100 });
  await setupDefinitionRepository.create({ definition: setupDefinition, metadata });
  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: {
      async getById(symbolId): Promise<MonitoredSymbol | null> {
        return symbolId === monitoredSymbol.symbolId ? monitoredSymbol : null;
      }
    }
  });
  await signalCandidateService.createSignalCandidate({
    candidate: {
      id: "candidate-evaluation-001",
      setupDefinitionId: setupDefinition.id,
      setupRevisionId: "revision-evaluation-001",
      monitoredSymbolId: monitoredSymbol.symbolId,
      status: "detected",
      detectedAt: detectionCandle.eventTimestampUtc,
      evidenceSummary: "closed-candle breakout",
      createdAt: detectionCandle.eventTimestampUtc,
      updatedAt: detectionCandle.eventTimestampUtc
    },
    metadata
  });
  const evaluationService = createEvaluationService({
    evaluationResultRepository,
    signalCandidateRepository
  });
  const candidateHandoff = createSignalCandidateToEvaluationHandoff({
    evaluationService,
    signalCandidateService,
    signalCandidateRepository,
    evaluationResultRepository
  });
  const runtime = createClosedCandleEvaluationRuntime({
    candidateRepository: signalCandidateRepository,
    evaluationResultRepository,
    candidateHandoff,
    evaluationService,
    signalCandidateService
  });
  return {
    candidateHandoff,
    detectionCandle,
    evaluationService,
    evaluationResultRepository,
    runtime,
    signalCandidateService,
    signalCandidateRepository
  };
};

type ObservationOptions = {
  finalClose?: number;
  high?: number;
  low?: number;
};

const observationsFor = (
  detectionCandle: CandleClosedEvent,
  options: ObservationOptions = {}
): CandleClosedEvent[] => {
  const firstOpenTimeMs = Date.parse(detectionCandle.payload.closeTimeUtc) + 1;
  return Array.from({ length: CANDLE_EVALUATION_OBSERVATION_COUNT }, (_, index) =>
    candleAt(firstOpenTimeMs + index * FIVE_MINUTES_MS, {
      close:
        index === CANDLE_EVALUATION_OBSERVATION_COUNT - 1 ? (options.finalClose ?? 103) : 100,
      high: index === 10 ? (options.high ?? 110) : 104,
      low:
        index === 20
          ? (options.low ?? 90)
          : Math.min(index === CANDLE_EVALUATION_OBSERVATION_COUNT - 1 ? (options.finalClose ?? 103) : 100, 98)
    })
  );
};

test("completes a 24-hour window and transitions the candidate to evaluated", async () => {
  const fixture = await createFixture();
  const observationCandles = observationsFor(fixture.detectionCandle);

  const outcome = await fixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles
  });
  const result = await fixture.evaluationResultRepository.getById(outcome.evaluationResultId ?? "");
  const candidate = await fixture.signalCandidateRepository.getById("candidate-evaluation-001");

  assert.equal(outcome.status, "completed");
  assert.equal(result?.status, "completed");
  assert.equal(result?.referencePrice, 100);
  assert.equal(result?.finalPrice, 103);
  assert.equal(result?.highInWindow, 110);
  assert.equal(result?.lowInWindow, 90);
  assert.equal(result?.absoluteMove, 3);
  assert.equal(result?.percentageMove, 3);
  assert.equal(result?.maxFavorableExcursion, 10);
  assert.equal(result?.maxAdverseExcursion, -10);
  assert.match(result?.notes ?? "", /observations=288/);
  assert.equal(candidate?.status, "evaluated");
});

test("derives flat and down outcomes from the final close", async () => {
  const flatFixture = await createFixture();
  const flat = await flatFixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: flatFixture.detectionCandle,
    observationCandles: observationsFor(flatFixture.detectionCandle, { finalClose: 100 })
  });
  const downFixture = await createFixture();
  const down = await downFixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: downFixture.detectionCandle,
    observationCandles: observationsFor(downFixture.detectionCandle, { finalClose: 97 })
  });

  assert.equal(
    (await flatFixture.evaluationResultRepository.getById(flat.evaluationResultId ?? ""))?.percentageMove,
    0
  );
  assert.equal(
    (await downFixture.evaluationResultRepository.getById(down.evaluationResultId ?? ""))?.absoluteMove,
    -3
  );
});

test("returns an explicit duplicate for a completed candidate/window", async () => {
  const fixture = await createFixture();
  const request = {
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles: observationsFor(fixture.detectionCandle)
  };
  await fixture.runtime.evaluate(request);

  const outcome = await fixture.runtime.evaluate(request);

  assert.equal(outcome.status, "rejected_duplicate");
  assert.equal(outcome.reason, "evaluation result is already completed for candidate/window");
});

test("rejects incomplete or misaligned windows before creating an evaluation result", async () => {
  const fixture = await createFixture();
  const observationCandles = observationsFor(fixture.detectionCandle);
  observationCandles.pop();

  const outcome = await fixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles
  });

  assert.equal(outcome.status, "rejected_validation");
  assert.equal(await fixture.evaluationResultRepository.getBySignalCandidateAndWindow("candidate-evaluation-001", CANDLE_EVALUATION_WINDOW_ID), null);
});

test("rejects mismatched and malformed candle data before product writes", async () => {
  const fixture = await createFixture();
  const observationCandles = observationsFor(fixture.detectionCandle);
  observationCandles[4] = candleAt(Date.parse(observationCandles[4]?.payload.openTimeUtc ?? ""), {
    symbolId: "ETH-USDT"
  });

  const mismatched = await fixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles
  });
  const malformed = await fixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: {
      ...fixture.detectionCandle,
      eventTimestampUtc: "not-a-timestamp"
    },
    observationCandles: observationsFor(fixture.detectionCandle)
  });

  assert.equal(mismatched.status, "rejected_validation");
  assert.equal(malformed.status, "rejected_validation");
  assert.equal(await fixture.evaluationResultRepository.getBySignalCandidateAndWindow("candidate-evaluation-001", CANDLE_EVALUATION_WINDOW_ID), null);
});

test("rejects duplicate and non-terminal observations before product writes", async () => {
  const fixture = await createFixture();
  const duplicateObservations = observationsFor(fixture.detectionCandle);
  const duplicateTarget = duplicateObservations[4];
  const duplicateSource = duplicateObservations[3];
  if (!duplicateTarget || !duplicateSource) {
    throw new Error("expected duplicate observation fixtures");
  }
  duplicateObservations[4] = { ...duplicateTarget, eventId: duplicateSource.eventId };
  const shiftedObservations = observationsFor(fixture.detectionCandle);
  const finalObservation = shiftedObservations.at(-1);
  if (!finalObservation) {
    throw new Error("expected final observation");
  }
  shiftedObservations[shiftedObservations.length - 1] = candleAt(
    Date.parse(finalObservation.payload.openTimeUtc) - FIVE_MINUTES_MS
  );

  const duplicate = await fixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles: duplicateObservations
  });
  const shifted = await fixture.runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles: shiftedObservations
  });

  assert.equal(duplicate.status, "rejected_validation");
  assert.equal(shifted.status, "rejected_validation");
  assert.equal(await fixture.evaluationResultRepository.getBySignalCandidateAndWindow("candidate-evaluation-001", CANDLE_EVALUATION_WINDOW_ID), null);
});

test("retries an in-progress evaluation after finalization failure", async () => {
  const fixture = await createFixture();
  const request = {
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles: observationsFor(fixture.detectionCandle)
  };
  const failingRuntime = createClosedCandleEvaluationRuntime({
    candidateRepository: fixture.signalCandidateRepository,
    evaluationResultRepository: fixture.evaluationResultRepository,
    candidateHandoff: fixture.candidateHandoff,
    evaluationService: {
      async finalizeEvaluationResult(): Promise<null> {
        throw new Error("temporary finalization failure");
      }
    },
    signalCandidateService: fixture.signalCandidateService
  });
  const failed = await failingRuntime.evaluate(request);
  const retryRuntime = createClosedCandleEvaluationRuntime({
    candidateRepository: fixture.signalCandidateRepository,
    evaluationResultRepository: fixture.evaluationResultRepository,
    candidateHandoff: fixture.candidateHandoff,
    evaluationService: fixture.evaluationService,
    signalCandidateService: fixture.signalCandidateService
  });

  const completed = await retryRuntime.evaluate(request);

  assert.equal(failed.status, "failed");
  assert.equal(failed.reason, "temporary finalization failure");
  assert.equal(completed.status, "completed");
});

test("reports a warning when final candidate status update fails", async () => {
  const fixture = await createFixture();
  const runtime = createClosedCandleEvaluationRuntime({
    candidateRepository: fixture.signalCandidateRepository,
    evaluationResultRepository: fixture.evaluationResultRepository,
    candidateHandoff: fixture.candidateHandoff,
    evaluationService: fixture.evaluationService,
    signalCandidateService: {
      async updateSignalCandidateStatus(): Promise<null> {
        throw new Error("candidate update unavailable");
      }
    }
  });

  const outcome = await runtime.evaluate({
    signalCandidateId: "candidate-evaluation-001",
    detectionCandle: fixture.detectionCandle,
    observationCandles: observationsFor(fixture.detectionCandle)
  });

  assert.equal(outcome.status, "completed");
  assert.deepEqual(outcome.warnings, [
    "signal_candidate status update failed: candidate update unavailable"
  ]);
});
