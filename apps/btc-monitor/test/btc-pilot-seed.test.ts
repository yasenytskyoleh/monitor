import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryMonitoredSymbolRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySetupRevisionActivationRecordRepository,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SetupDefinitionRevision
} from "@monitor/domain-model";

import { BtcPilotSeedConflictError, seedBtcPilot } from "../src/btc-pilot-seed.js";

const NOW = new Date("2026-09-14T12:00:00.000Z");
const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "btc-local-pilot-seed",
  sourceObservedAtUtc: NOW.toISOString()
};

const createRepositories = () => ({
  monitoredSymbolRepository: new InMemoryMonitoredSymbolRepository(),
  setupDefinitionRepository: new InMemorySetupDefinitionRepository(),
  setupDefinitionRevisionRepository: new InMemorySetupDefinitionRevisionRepository(),
  setupRevisionActivationRecordRepository: new InMemorySetupRevisionActivationRecordRepository()
});

const definition = (description = "Bullish close above the previous twenty closed five-minute candle highs."): SetupDefinition => ({
  id: "setup-btc-breakout",
  name: "BTC five-minute breakout",
  description,
  status: "draft",
  measurableConditions: ["5m close is above every high in the previous 20 closed 5m candles"],
  evaluationAssumptions: ["Evaluate price follow-through over the next 24 hours"],
  invalidationAssumptions: ["No automatic invalidation or order execution"],
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString()
});

const revision: SetupDefinitionRevision = {
  id: "revision-btc-breakout-1",
  setupDefinitionId: "setup-btc-breakout",
  versionInfo: {
    setupFamilyId: "family-btc-breakout",
    revisionId: "revision-btc-breakout-1",
    version: 1
  },
  revisionReason: "Initial canonical local BTC breakout pilot",
  revisionStatus: "accepted",
  changedFieldsSummary: "Initial five-minute breakout definition",
  createdBy: "btc-local-pilot-seed",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString()
};

const symbolWithStorageOrderedBinding: MonitoredSymbol = {
  symbolId: "BTC-USDT",
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: ["btc", "spot", "local-pilot"],
  sourceBindings: [{
    canonicalSymbol: "BTC-USDT",
    isPrimary: true,
    providerSymbol: "BTCUSDT",
    sourceId: "binance-spot-mainnet"
  }],
  createdAtUtc: NOW.toISOString(),
  updatedAtUtc: NOW.toISOString()
};

test("creates and activates a fresh canonical BTC pilot", async () => {
  const repositories = createRepositories();

  const result = await seedBtcPilot({ repositories, now: NOW });

  assert.deepEqual(result, {
    setupDefinition: "created",
    revision: "created",
    monitoredSymbol: "created",
    activation: "created"
  });
  assert.equal((await repositories.setupDefinitionRepository.getById("setup-btc-breakout"))?.status, "active");
  assert.equal((await repositories.monitoredSymbolRepository.getById("BTC-USDT"))?.status, "active");
  assert.equal(
    (await repositories.setupRevisionActivationRecordRepository.listBySetupFamilyId("family-btc-breakout"))[0]
      ?.targetRevisionId,
    revision.id
  );
});

test("is idempotent for an existing canonical BTC pilot", async () => {
  const repositories = createRepositories();
  await seedBtcPilot({ repositories, now: NOW });

  const result = await seedBtcPilot({ repositories, now: new Date("2026-09-14T13:00:00.000Z") });

  assert.deepEqual(result, {
    setupDefinition: "existing",
    revision: "existing",
    monitoredSymbol: "existing",
    activation: "existing"
  });
  assert.equal(
    (await repositories.setupRevisionActivationRecordRepository.listBySetupFamilyId("family-btc-breakout")).length,
    1
  );
});

test("completes compatible partial pilot state", async () => {
  const repositories = createRepositories();
  await repositories.setupDefinitionRepository.create({ definition: definition(), metadata });
  await repositories.setupDefinitionRevisionRepository.create({ revision, metadata });
  await repositories.monitoredSymbolRepository.create({
    symbol: symbolWithStorageOrderedBinding,
    metadata
  });

  const result = await seedBtcPilot({ repositories, now: NOW });

  assert.deepEqual(result, {
    setupDefinition: "existing",
    revision: "existing",
    monitoredSymbol: "existing",
    activation: "created"
  });
  assert.equal((await repositories.setupDefinitionRepository.getById("setup-btc-breakout"))?.status, "active");
});

test("rejects conflicting records before creating missing pilot state", async () => {
  const repositories = createRepositories();
  await repositories.setupDefinitionRepository.create({
    definition: definition("A different strategy"),
    metadata
  });

  await assert.rejects(
    () => seedBtcPilot({ repositories, now: NOW }),
    (error: unknown) =>
      error instanceof BtcPilotSeedConflictError &&
      error.message === "setup_definition conflicts with the canonical BTC pilot seed"
  );
  assert.equal(await repositories.setupDefinitionRevisionRepository.getById(revision.id), null);
  assert.equal(await repositories.monitoredSymbolRepository.getById("BTC-USDT"), null);
});

test("rejects an activation whose setup definition is not active", async () => {
  const repositories = createRepositories();
  await repositories.setupDefinitionRepository.create({ definition: definition(), metadata });
  await repositories.setupDefinitionRevisionRepository.create({ revision, metadata });
  await repositories.setupRevisionActivationRecordRepository.create({
    activation: {
      id: "activation-btc-breakout-1",
      setupFamilyId: "family-btc-breakout",
      targetRevisionId: revision.id,
      targetSetupDefinitionId: revision.setupDefinitionId,
      activatedBy: "fixture",
      activatedAt: NOW.toISOString(),
      activationOutcome: "activated",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    },
    metadata
  });

  await assert.rejects(
    () => seedBtcPilot({ repositories, now: NOW }),
    (error: unknown) =>
      error instanceof BtcPilotSeedConflictError &&
      error.message === "pilot activation conflicts with setup_definition status"
  );
  assert.equal(await repositories.monitoredSymbolRepository.getById("BTC-USDT"), null);
});
