import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryMonitoredSymbolRepository,
  MonitoringCatalogValidationError,
  RepositoryError,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  createMonitoringCatalogService
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-monitoring-catalog-tests",
  sourceObservedAtUtc: "2026-07-24T09:00:00.000Z"
};

const buildMonitoredSymbol = (symbolId: string): MonitoredSymbol => ({
  symbolId,
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: ["primary"],
  sourceBindings: [],
  createdAtUtc: "2026-07-24T08:00:00.000Z",
  updatedAtUtc: "2026-07-24T08:00:00.000Z"
});

test("registers and lists monitored symbols through the catalog service", async () => {
  const repository = new InMemoryMonitoredSymbolRepository();
  const service = createMonitoringCatalogService({ monitoredSymbolRepository: repository });

  const registered = await service.registerMonitoredSymbol({
    symbol: buildMonitoredSymbol("BTC-USDT"),
    metadata
  });

  assert.equal(registered.symbolId, "BTC-USDT");
  assert.deepEqual(await repository.listByStatus(["active"]), [registered]);
});

test("rejects duplicate monitored-symbol enrollment", async () => {
  const repository = new InMemoryMonitoredSymbolRepository();
  const service = createMonitoringCatalogService({ monitoredSymbolRepository: repository });
  const request = { symbol: buildMonitoredSymbol("BTC-USDT"), metadata };

  await service.registerMonitoredSymbol(request);

  await assert.rejects(
    () => service.registerMonitoredSymbol(request),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "monitored_symbol"
  );
});

test("updates monitored-symbol status with catalog metadata timing", async () => {
  const repository = new InMemoryMonitoredSymbolRepository();
  const service = createMonitoringCatalogService({ monitoredSymbolRepository: repository });

  await service.registerMonitoredSymbol({
    symbol: buildMonitoredSymbol("BTC-USDT"),
    metadata
  });

  const updated = await service.updateMonitoredSymbolStatus({
    symbolId: "BTC-USDT",
    status: "paused",
    metadata: {
      ...metadata,
      sourceObservedAtUtc: "2026-07-24T10:00:00.000Z"
    }
  });

  assert.equal(updated?.status, "paused");
  assert.equal(updated?.updatedAtUtc, "2026-07-24T10:00:00.000Z");
});

test("enforces repository expected versions for monitored-symbol updates", async () => {
  const repository = new InMemoryMonitoredSymbolRepository();
  const symbol = buildMonitoredSymbol("BTC-USDT");
  await repository.create({ symbol, metadata });

  await assert.rejects(
    () =>
      repository.update({
        symbol: { ...symbol, displayName: "Bitcoin / Tether" },
        metadata,
        expectedVersion: 2
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.operation === "update"
  );
});

test("rejects invalid monitored-symbol catalog input", async () => {
  const repository = new InMemoryMonitoredSymbolRepository();
  const service = createMonitoringCatalogService({ monitoredSymbolRepository: repository });

  await assert.rejects(
    () =>
      service.registerMonitoredSymbol({
        symbol: { ...buildMonitoredSymbol("BTC-USDT"), baseAsset: "" },
        metadata
      }),
    (error: unknown) =>
      error instanceof MonitoringCatalogValidationError && error.message === "baseAsset is required"
  );
});
