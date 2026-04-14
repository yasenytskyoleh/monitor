import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRepository,
  InMemorySignalCandidateRepository,
  SignalCandidateValidationError,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type SetupDefinition,
  createSignalCandidateService
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "detection_pipeline",
  traceId: "trace-signal-candidate-tests",
  sourceObservedAtUtc: "2026-04-15T12:00:00.000Z"
};

const buildSetupDefinition = (id: string): SetupDefinition => ({
  id,
  name: "Breakout setup",
  description: "Breakout and retest setup",
  status: "active",
  measurableConditions: ["close above breakout range high on 4h"],
  evaluationAssumptions: ["fixed 24h window"],
  invalidationAssumptions: ["invalidate on immediate range failure"],
  createdAt: "2026-04-15T11:00:00.000Z",
  updatedAt: "2026-04-15T11:00:00.000Z"
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
  createdAtUtc: "2026-04-15T11:00:00.000Z",
  updatedAtUtc: "2026-04-15T11:00:00.000Z"
});

const buildSignalCandidate = (
  id: string,
  setupDefinitionId: string,
  monitoredSymbolId: string
) => ({
  id,
  setupDefinitionId,
  monitoredSymbolId,
  status: "detected" as const,
  detectedAt: "2026-04-15T11:30:00.000Z",
  evidenceSummary: "4h breakout retest with volume expansion",
  createdAt: "2026-04-15T11:30:00.000Z",
  updatedAt: "2026-04-15T11:30:00.000Z"
});

const createMonitoredSymbolRepositoryStub = (symbols: MonitoredSymbol[]) => {
  const symbolsById = new Map(symbols.map((symbol) => [symbol.symbolId, symbol]));
  return {
    async getById(symbolId: string): Promise<MonitoredSymbol | null> {
      return symbolsById.get(symbolId) ?? null;
    }
  };
};

test("create signal candidate", async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();

  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-010"),
    metadata
  });

  const service = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([
      buildMonitoredSymbol("BTC-USDT")
    ])
  });

  const created = await service.createSignalCandidate({
    candidate: buildSignalCandidate("candidate-010", "setup-010", "BTC-USDT"),
    metadata
  });

  assert.equal(created.id, "candidate-010");
  assert.equal(created.status, "detected");
});

test("reject candidate with missing setup definition", async () => {
  const service = createSignalCandidateService({
    signalCandidateRepository: new InMemorySignalCandidateRepository(),
    setupDefinitionRepository: new InMemorySetupDefinitionRepository(),
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([
      buildMonitoredSymbol("BTC-USDT")
    ])
  });

  await assert.rejects(
    async () =>
      service.createSignalCandidate({
        candidate: buildSignalCandidate("candidate-011", "setup-missing", "BTC-USDT"),
        metadata
      }),
    (error: unknown) =>
      error instanceof SignalCandidateValidationError &&
      error.message.includes("setup_definition not found")
  );
});

test("reject candidate with invalid monitored symbol reference", async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-012"),
    metadata
  });

  const service = createSignalCandidateService({
    signalCandidateRepository: new InMemorySignalCandidateRepository(),
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([])
  });

  await assert.rejects(
    async () =>
      service.createSignalCandidate({
        candidate: buildSignalCandidate("candidate-012", "setup-012", "BTC-USDT"),
        metadata
      }),
    (error: unknown) =>
      error instanceof SignalCandidateValidationError &&
      error.message.includes("monitored_symbol not found")
  );
});

test("allowed lifecycle transitions succeed", async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-013"),
    metadata
  });

  const service = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([
      buildMonitoredSymbol("BTC-USDT")
    ])
  });

  await service.createSignalCandidate({
    candidate: buildSignalCandidate("candidate-013", "setup-013", "BTC-USDT"),
    metadata
  });

  const underReview = await service.updateSignalCandidateStatus({
    signalCandidateId: "candidate-013",
    status: "under_review",
    metadata,
    expectedVersion: null
  });
  const evaluated = await service.updateSignalCandidateStatus({
    signalCandidateId: "candidate-013",
    status: "evaluated",
    metadata,
    expectedVersion: null
  });

  assert.equal(underReview?.status, "under_review");
  assert.equal(evaluated?.status, "evaluated");
});

test("invalid lifecycle transitions fail", async () => {
  const setupDefinitionRepository = new InMemorySetupDefinitionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();
  await setupDefinitionRepository.create({
    definition: buildSetupDefinition("setup-014"),
    metadata
  });

  const service = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([
      buildMonitoredSymbol("BTC-USDT")
    ])
  });

  await service.createSignalCandidate({
    candidate: buildSignalCandidate("candidate-014", "setup-014", "BTC-USDT"),
    metadata
  });

  await assert.rejects(
    async () =>
      service.updateSignalCandidateStatus({
        signalCandidateId: "candidate-014",
        status: "evaluated",
        metadata,
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof SignalCandidateValidationError &&
      error.message.includes("invalid signal_candidate status transition")
  );
});

test("repository can retrieve candidate by id", async () => {
  const repository = new InMemorySignalCandidateRepository();
  await repository.create({
    candidate: buildSignalCandidate("candidate-015", "setup-015", "BTC-USDT"),
    metadata
  });

  const candidate = await repository.getById("candidate-015");
  assert.equal(candidate?.id, "candidate-015");
});

test("repository lists candidates by setup definition and status", async () => {
  const repository = new InMemorySignalCandidateRepository();

  await repository.create({
    candidate: buildSignalCandidate("candidate-016", "setup-016", "BTC-USDT"),
    metadata
  });
  await repository.create({
    candidate: buildSignalCandidate("candidate-017", "setup-017", "ETH-USDT"),
    metadata
  });
  await repository.updateStatus({
    signalCandidateId: "candidate-017",
    status: "under_review",
    metadata,
    expectedVersion: null
  });

  const bySetup = await repository.listBySetupDefinitionId("setup-016");
  const byStatus = await repository.listByStatus(["under_review"]);

  assert.equal(bySetup.length, 1);
  assert.equal(bySetup[0]?.id, "candidate-016");
  assert.equal(byStatus.length, 1);
  assert.equal(byStatus[0]?.id, "candidate-017");
});
