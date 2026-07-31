import assert from "node:assert/strict";
import test from "node:test";

import type {
  CandleClosedEvent,
  DetectionToCandidateCommand,
  MonitoredSymbol,
  ProductRecordMetadata,
  RuntimeHandoffResult,
  SetupDefinition,
  SetupDefinitionRevision,
  SetupRevisionResolutionResult
} from "@monitor/domain-model";
import {
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySignalCandidateRepository,
  createActiveSetupRevisionResolutionHandoff,
  createSetupDefinitionService,
  createSignalCandidateFromDetectionHandoff,
  createSignalCandidateService
} from "@monitor/domain-model";

import {
  CLOSED_CANDLE_BREAKOUT_RULE,
  ClosedCandlePatternDetectionConfigurationError,
  createClosedCandlePatternDetectionRuntime,
  type ActiveSetupRevisionResolver,
  type ClosedCandleBreakoutDetectorConfig,
  type DetectionCandidateHandoff
} from "../src/index.js";

const START_TIME_MS = Date.parse("2026-07-29T00:00:00.000Z");
const FIVE_MINUTES_MS = 300_000;

type FixtureOptions = {
  high?: number;
  close?: number;
  eventId?: string;
  sourceId?: string;
  symbolId?: string;
  timeframe?: "1m" | "5m";
};

const candle = (index: number, options: FixtureOptions = {}): CandleClosedEvent => {
  const timeframe = options.timeframe ?? "5m";
  const intervalMs = timeframe === "5m" ? FIVE_MINUTES_MS : 60_000;
  const openTimeMs = START_TIME_MS + index * intervalMs;
  const close = options.close ?? 99;
  const high = options.high ?? 100;
  return {
    eventId: options.eventId ?? `fixture:${timeframe}:${index}`,
    sourceId: options.sourceId ?? "fixture-source",
    symbolId: options.symbolId ?? "BTC-USDT",
    eventType: "candle_closed",
    eventTimestampUtc: new Date(openTimeMs + intervalMs - 1).toISOString(),
    payload: {
      timeframe,
      open: 98,
      high,
      low: 97,
      close,
      volume: 10,
      openTimeUtc: new Date(openTimeMs).toISOString(),
      closeTimeUtc: new Date(openTimeMs + intervalMs - 1).toISOString()
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

const detector: ClosedCandleBreakoutDetectorConfig = {
  setupDefinitionId: "setup-breakout-001",
  monitoredSymbolId: "BTC-USDT",
  timeframe: "5m",
  rule: CLOSED_CANDLE_BREAKOUT_RULE
};

const resolvedRevision = (revisionId = "revision-breakout-001"): SetupRevisionResolutionResult => ({
  status: "resolved",
  resolution: {
    resolvedAt: "2026-07-29T02:00:00.000Z",
    revisionRef: {
      setupFamilyId: "setup-family-breakout-001",
      setupDefinitionId: detector.setupDefinitionId,
      setupRevisionId: revisionId,
      version: 1
    },
    effectiveStatus: "active",
    revisionStatus: "accepted"
  },
  warnings: []
});

const createResolver = (
  result: SetupRevisionResolutionResult = resolvedRevision()
): ActiveSetupRevisionResolver => ({
  async resolve(): Promise<SetupRevisionResolutionResult> {
    return result;
  }
});

const createHandoff = (
  result: RuntimeHandoffResult = { status: "created", signalCandidateId: "candidate-001", warnings: [] }
): { handoff: DetectionCandidateHandoff; commands: DetectionToCandidateCommand[]; metadata: ProductRecordMetadata[] } => {
  const commands: DetectionToCandidateCommand[] = [];
  const metadata: ProductRecordMetadata[] = [];
  return {
    handoff: {
      async handoff(command, recordMetadata): Promise<RuntimeHandoffResult> {
        commands.push(command);
        metadata.push(recordMetadata);
        return result;
      }
    },
    commands,
    metadata
  };
};

const seedHistory = async (
  runtime: ReturnType<typeof createClosedCandlePatternDetectionRuntime>,
  count = 20,
  high = 100,
  startIndex = 0
): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await runtime.process(candle(startIndex + index, { high, close: high - 1 }));
  }
};

test("detects a strict 5m close breakout and hands it to the product domain", async () => {
  const handoff = createHandoff();
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: handoff.handoff
  });
  await seedHistory(runtime);

  const trigger = candle(20, { high: 102, close: 101 });
  const outcomes = await runtime.process(trigger);

  assert.equal(outcomes[0]?.status, "detected");
  assert.equal(
    outcomes[0]?.detectionHitId,
    "detection-setup-breakout-001-revision-breakout-001-bullish_close_breakout_v1-fixture:5m:20"
  );
  assert.equal(handoff.commands.length, 1);
  assert.equal(handoff.commands[0]?.setupRevisionId, "revision-breakout-001");
  assert.equal(handoff.commands[0]?.sourceMetadata?.eventId, trigger.eventId);
  assert.match(handoff.commands[0]?.evidenceSummary ?? "", /close=101; threshold=100; lookback=20/);
  assert.equal(handoff.metadata[0]?.traceId, trigger.eventId);
  assert.equal(handoff.metadata[0]?.sourceObservedAtUtc, trigger.eventTimestampUtc);
});

test("persists a candidate through the existing domain handoffs", async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  const recordMetadata: ProductRecordMetadata = {
    originRunId: null,
    originTransitionId: null,
    createdBySource: "manual_curation",
    lastUpdatedBySource: "manual_curation",
    traceId: null,
    sourceObservedAtUtc: "2026-07-29T00:00:00.000Z"
  };
  const definition: SetupDefinition = {
    id: detector.setupDefinitionId,
    name: "Breakout setup",
    description: "Closed-candle breakout setup",
    status: "active",
    measurableConditions: ["Close above prior range high"],
    evaluationAssumptions: ["Evaluate follow-through"],
    invalidationAssumptions: ["Close below range"],
    createdAt: recordMetadata.sourceObservedAtUtc ?? "2026-07-29T00:00:00.000Z",
    updatedAt: recordMetadata.sourceObservedAtUtc ?? "2026-07-29T00:00:00.000Z"
  };
  const revision: SetupDefinitionRevision = {
    id: "revision-breakout-001",
    setupDefinitionId: definition.id,
    versionInfo: {
      setupFamilyId: "setup-family-breakout-001",
      revisionId: "revision-breakout-001",
      version: 1
    },
    revisionReason: "Initial breakout rule",
    revisionStatus: "accepted",
    changedFieldsSummary: "Initial revision",
    createdBy: "fixture",
    createdAt: definition.createdAt,
    sourceSetupRefinementRequestId: "refinement-breakout-001",
    updatedAt: definition.updatedAt
  };
  const monitoredSymbol: MonitoredSymbol = {
    symbolId: detector.monitoredSymbolId,
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
  await setupDefinitionRepository.create({ definition, metadata: recordMetadata });
  await setupDefinitionRevisionRepository.create({ revision, metadata: recordMetadata });

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository,
    setupDefinitionRevisionRepository
  });
  const candidateHandoff = createSignalCandidateFromDetectionHandoff({
    signalCandidateService: createSignalCandidateService({
      signalCandidateRepository,
      setupDefinitionRepository,
      monitoredSymbolRepository: {
        async getById(symbolId): Promise<MonitoredSymbol | null> {
          return symbolId === monitoredSymbol.symbolId ? monitoredSymbol : null;
        }
      }
    }),
    setupDefinitionService,
    signalCandidateRepository
  });
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createActiveSetupRevisionResolutionHandoff({
      setupDefinitionService
    }),
    candidateHandoff
  });
  await seedHistory(runtime);

  const outcomes = await runtime.process(candle(20, { high: 101, close: 101 }));
  const candidateId = outcomes[0]?.handoffResult?.signalCandidateId;

  assert.equal(outcomes[0]?.status, "detected");
  assert.ok(candidateId);
  assert.equal((await signalCandidateRepository.getById(candidateId ?? ""))?.setupRevisionId, revision.id);
});

test("requires twenty prior candles and a strictly greater close", async () => {
  const handoff = createHandoff();
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: handoff.handoff
  });

  await seedHistory(runtime, 19);
  assert.equal((await runtime.process(candle(19, { high: 102, close: 101 })))[0]?.status, "no_match");
  assert.equal((await runtime.process(candle(20, { high: 100, close: 100 })))[0]?.status, "no_match");
  assert.equal(handoff.commands.length, 0);
});

test("retains only the latest lookback window", async () => {
  const handoff = createHandoff();
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: handoff.handoff
  });
  await runtime.process(candle(0, { high: 200, close: 199 }));
  await seedHistory(runtime, 20, 100, 1);

  const outcomes = await runtime.process(candle(21, { high: 111, close: 110 }));

  assert.equal(outcomes[0]?.status, "detected");
  assert.match(handoff.commands[0]?.evidenceSummary ?? "", /threshold=100/);
});

test("isolates histories by source and symbol and ignores unmatched timeframes", async () => {
  const handoff = createHandoff();
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: handoff.handoff
  });

  for (let index = 0; index < 20; index += 1) {
    await runtime.process(candle(index, { symbolId: "ETH-USDT" }));
  }
  assert.equal((await runtime.process(candle(20, { high: 101, close: 101 })))[0]?.status, "no_match");
  assert.equal((await runtime.process(candle(0, { timeframe: "1m" })))[0]?.reason, "unconfigured_symbol_or_timeframe");
  assert.equal((await runtime.process(candle(0, { sourceId: "second-source" })))[0]?.status, "no_match");
  assert.equal(handoff.commands.length, 0);
});

test("ignores duplicate, malformed, and out-of-order candles", async () => {
  const handoff = createHandoff();
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: handoff.handoff
  });
  const first = candle(0);
  await runtime.process(first);

  assert.equal((await runtime.process(first))[0]?.reason, "duplicate_event");
  assert.equal((await runtime.process(candle(0, { eventId: "different-event" })))[0]?.reason, "out_of_order_candle");
  assert.equal((await runtime.process(candle(1, { high: 90, close: 95 })))[0]?.reason, "invalid_candle");
  assert.equal(handoff.commands.length, 0);
});

test("surfaces revision resolution and handoff outcomes without changing their meaning", async () => {
  const rejectedHandoff = createHandoff({
    status: "rejected_duplicate",
    signalCandidateId: "candidate-existing",
    warnings: []
  });
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: rejectedHandoff.handoff
  });
  await seedHistory(runtime);
  const duplicate = await runtime.process(candle(20, { high: 101, close: 101 }));
  assert.equal(duplicate[0]?.status, "detected");
  assert.equal(duplicate[0]?.handoffResult?.status, "rejected_duplicate");

  const failedRuntime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver({ status: "failed", reason: "database unavailable", warnings: [] }),
    candidateHandoff: createHandoff().handoff
  });
  await seedHistory(failedRuntime);
  const failed = await failedRuntime.process(candle(20, { high: 101, close: 101 }));
  assert.equal(failed[0]?.status, "failed");
  assert.equal(failed[0]?.reason, "database unavailable");

  const validationRuntime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver({ status: "rejected", reason: "setup paused", warnings: [] }),
    candidateHandoff: createHandoff().handoff
  });
  await seedHistory(validationRuntime);
  const rejected = await validationRuntime.process(candle(20, { high: 101, close: 101 }));
  assert.equal(rejected[0]?.status, "rejected");
  assert.equal(rejected[0]?.reason, "setup paused");

  const failedHandoffRuntime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: createHandoff({ status: "failed", reason: "write failed", warnings: [] }).handoff
  });
  await seedHistory(failedHandoffRuntime);
  const handoffFailure = await failedHandoffRuntime.process(candle(20, { high: 101, close: 101 }));
  assert.equal(handoffFailure[0]?.status, "failed");
  assert.equal(handoffFailure[0]?.handoffResult?.reason, "write failed");

  const throwingHandoffRuntime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: {
      async handoff(): Promise<RuntimeHandoffResult> {
        throw new Error("connection lost");
      }
    }
  });
  await seedHistory(throwingHandoffRuntime);
  const thrownFailure = await throwingHandoffRuntime.process(candle(20, { high: 101, close: 101 }));
  assert.equal(thrownFailure[0]?.status, "failed");
  assert.equal(thrownFailure[0]?.reason, "connection lost");
});

test("retries a detected candle after a transient handoff failure", async () => {
  let handoffAttempts = 0;
  const runtime = createClosedCandlePatternDetectionRuntime({
    detectors: [detector],
    activeSetupRevisionResolver: createResolver(),
    candidateHandoff: {
      async handoff(): Promise<RuntimeHandoffResult> {
        handoffAttempts += 1;
        return handoffAttempts === 1
          ? { status: "failed", reason: "database unavailable", warnings: [] }
          : { status: "created", signalCandidateId: "candidate-001", warnings: [] };
      }
    }
  });
  await seedHistory(runtime);
  const trigger = candle(20, { high: 101, close: 101 });

  assert.equal((await runtime.process(trigger))[0]?.status, "failed");
  assert.equal((await runtime.process(trigger))[0]?.status, "detected");
  assert.equal(handoffAttempts, 2);
});

test("rejects invalid and duplicate detector configurations", () => {
  const handoff = createHandoff();
  assert.throws(
    () =>
      createClosedCandlePatternDetectionRuntime({
        detectors: [{ ...detector, monitoredSymbolId: "" }],
        activeSetupRevisionResolver: createResolver(),
        candidateHandoff: handoff.handoff
      }),
    ClosedCandlePatternDetectionConfigurationError
  );
  assert.throws(
    () =>
      createClosedCandlePatternDetectionRuntime({
        detectors: [detector, detector],
        activeSetupRevisionResolver: createResolver(),
        candidateHandoff: handoff.handoff
      }),
    ClosedCandlePatternDetectionConfigurationError
  );
});
