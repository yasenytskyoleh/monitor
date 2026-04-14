import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  createSignalCandidateFromDetectionHandoff,
  createSignalCandidateService,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type SetupDefinition
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-runtime-handoff",
  originTransitionId: "transition-runtime-handoff",
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "detection_pipeline",
  traceId: "trace-runtime-handoff",
  sourceObservedAtUtc: "2026-04-19T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Runtime handoff setup",
  description: "Setup for runtime handoff tests",
  status: "active",
  measurableConditions: ["close above range high"],
  evaluationAssumptions: ["24h evaluation"],
  invalidationAssumptions: ["range failure invalidates"],
  createdAt: "2026-04-19T10:00:00.000Z",
  updatedAt: "2026-04-19T10:00:00.000Z"
});

const buildMonitoredSymbol = (symbolId: string): MonitoredSymbol => ({
  symbolId,
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: [],
  sourceBindings: [],
  createdAtUtc: "2026-04-19T10:00:00.000Z",
  updatedAtUtc: "2026-04-19T10:00:00.000Z"
});

const createMonitoredSymbolRepositoryStub = (symbols: MonitoredSymbol[]) => {
  const byId = new Map(symbols.map((symbol) => [symbol.symbolId, symbol]));
  return {
    async getById(symbolId: string): Promise<MonitoredSymbol | null> {
      return byId.get(symbolId) ?? null;
    }
  };
};

const createFixture = () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();

  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([buildMonitoredSymbol("BTC-USDT")])
  });

  const runtimeHandoff = createSignalCandidateFromDetectionHandoff({
    signalCandidateService,
    signalCandidateRepository
  });

  return {
    setupDefinitionRepository,
    signalCandidateRepository,
    runtimeHandoff
  };
};

test("valid detection handoff shape creates candidate", async () => {
  const { setupDefinitionRepository, runtimeHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-runtime-001"),
    metadata
  });

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-001",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-001",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(result.status, "created");
  assert.equal(typeof result.signalCandidateId, "string");
});

test("missing setup definition reference rejected", async () => {
  const { runtimeHandoff } = createFixture();

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-missing",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-002",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setup_definition not found"), true);
});

test("missing monitored symbol reference rejected", async () => {
  const { setupDefinitionRepository, signalCandidateRepository } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-runtime-003"),
    metadata
  });

  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([])
  });
  const runtimeHandoff = createSignalCandidateFromDetectionHandoff({
    signalCandidateService,
    signalCandidateRepository
  });

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-003",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-003",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("monitored_symbol not found"), true);
});

test("duplicate detection hit returns explicit duplicate outcome", async () => {
  const { setupDefinitionRepository, runtimeHandoff } = createFixture();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-runtime-004"),
    metadata
  });

  const first = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-004",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-duplicate",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );
  const second = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-004",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:01:00.000Z",
      detectionHitId: "hit-duplicate",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(first.status, "created");
  assert.equal(second.status, "rejected_duplicate");
  assert.equal(second.signalCandidateId, first.signalCandidateId);
});

test("handoff result shape is explicit for invalid command", async () => {
  const { runtimeHandoff } = createFixture();

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      evidenceSummary: ""
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(typeof result.reason, "string");
});
