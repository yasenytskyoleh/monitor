import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySignalCandidateRepository,
  createSetupDefinitionService,
  createSignalCandidateFromDetectionHandoff,
  createSignalCandidateService,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SetupDefinitionRevision
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

const buildRevision = (
  setupDefinitionId: string,
  revisionId: string,
  setupFamilyId: string
): SetupDefinitionRevision => ({
  id: revisionId,
  setupDefinitionId,
  versionInfo: {
    setupFamilyId,
    revisionId,
    version: 1
  },
  revisionReason: "runtime handoff revision",
  revisionStatus: "accepted",
  changedFieldsSummary: "baseline revision",
  createdBy: "research_reviewer_1",
  createdAt: "2026-04-19T10:00:00.000Z",
  sourceSetupRefinementRequestId: `refinement-${revisionId}`,
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
  const setupDefinitionRevisionRepository = new InMemorySetupDefinitionRevisionRepository();
  const signalCandidateRepository = new InMemorySignalCandidateRepository();

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository,
    setupDefinitionRevisionRepository
  });

  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository,
    setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([buildMonitoredSymbol("BTC-USDT")])
  });

  const runtimeHandoff = createSignalCandidateFromDetectionHandoff({
    signalCandidateService,
    setupDefinitionService,
    signalCandidateRepository
  });

  return {
    setupDefinitionRepository,
    setupDefinitionRevisionRepository,
    setupDefinitionService,
    signalCandidateRepository,
    runtimeHandoff
  };
};

const seedActiveSetupRevision = async (
  setupDefinitionId: string,
  revisionId: string,
  fixture: ReturnType<typeof createFixture>
): Promise<void> => {
  await fixture.setupDefinitionRepository.create({
    definition: buildSetupDefinition(setupDefinitionId),
    metadata
  });

  await fixture.setupDefinitionRevisionRepository.create({
    revision: buildRevision(setupDefinitionId, revisionId, setupDefinitionId),
    metadata
  });
};

test("valid detection handoff shape creates candidate", async () => {
  const fixture = createFixture();
  await seedActiveSetupRevision("setup-runtime-001", "revision-runtime-001", fixture);

  const result = await fixture.runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-001",
      setupRevisionId: "revision-runtime-001",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-001",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(result.status, "created");
  assert.equal(typeof result.signalCandidateId, "string");

  const candidate = await fixture.signalCandidateRepository.getById(result.signalCandidateId ?? "");
  assert.equal(candidate?.setupRevisionId, "revision-runtime-001");
});

test("missing setup definition reference rejected", async () => {
  const { runtimeHandoff } = createFixture();

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-missing",
      setupRevisionId: "revision-missing",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-002",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("active setup revision not found"), true);
});

test("missing monitored symbol reference rejected", async () => {
  const fixture = createFixture();
  await seedActiveSetupRevision("setup-runtime-003", "revision-runtime-003", fixture);

  const signalCandidateService = createSignalCandidateService({
    signalCandidateRepository: fixture.signalCandidateRepository,
    setupDefinitionRepository: fixture.setupDefinitionRepository,
    monitoredSymbolRepository: createMonitoredSymbolRepositoryStub([])
  });
  const runtimeHandoff = createSignalCandidateFromDetectionHandoff({
    signalCandidateService,
    setupDefinitionService: fixture.setupDefinitionService,
    signalCandidateRepository: fixture.signalCandidateRepository
  });

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-003",
      setupRevisionId: "revision-runtime-003",
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
  const fixture = createFixture();
  await seedActiveSetupRevision("setup-runtime-004", "revision-runtime-004", fixture);

  const first = await fixture.runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-004",
      setupRevisionId: "revision-runtime-004",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-duplicate",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );
  const second = await fixture.runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-004",
      setupRevisionId: "revision-runtime-004",
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

test("candidate creation without explicit setup revision is rejected", async () => {
  const fixture = createFixture();
  await seedActiveSetupRevision("setup-runtime-005", "revision-runtime-005", fixture);

  const result = await fixture.runtimeHandoff.handoff(
    {
      setupDefinitionId: "setup-runtime-005",
      setupRevisionId: "",
      monitoredSymbolId: "BTC-USDT",
      detectedAt: "2026-04-19T11:00:00.000Z",
      detectionHitId: "hit-005",
      evidenceSummary: "deterministic breakout rule hit"
    },
    metadata
  );

  assert.equal(result.status, "rejected_validation");
  assert.equal(result.reason?.includes("setupRevisionId is required"), true);
});

test("handoff result shape is explicit for invalid command", async () => {
  const { runtimeHandoff } = createFixture();

  const result = await runtimeHandoff.handoff(
    {
      setupDefinitionId: "",
      setupRevisionId: "",
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
