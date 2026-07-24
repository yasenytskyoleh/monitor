import assert from "node:assert/strict";
import test from "node:test";

import {
  composeMonitoredSymbolRelationalRepositories,
  InMemoryMonitoredSymbolRelationalRepositoryAdapter,
  RelationalMonitoredSymbolRepository,
  RepositoryError,
  type MonitoredSymbol,
  type ProductRecordMetadata
} from "../src/index.js";

const metadata: ProductRecordMetadata = { originRunId: null, originTransitionId: null, createdBySource: "manual_curation", lastUpdatedBySource: "manual_curation", traceId: "trace-001", sourceObservedAtUtc: "2026-07-24T10:00:00.000Z" };

const buildSymbol = (status: MonitoredSymbol["status"] = "active"): MonitoredSymbol => ({
  symbolId: "BTC-USDT", baseAsset: "BTC", quoteAsset: "USDT", displayName: "BTC/USDT", marketScope: "spot", status, providerHint: "unknown", tags: ["primary"], sourceBindings: [], createdAtUtc: "2026-07-24T08:00:00.000Z", updatedAtUtc: "2026-07-24T08:00:00.000Z"
});

test("relational monitored-symbol repository persists status updates", async () => {
  const repository = new RelationalMonitoredSymbolRepository(new InMemoryMonitoredSymbolRelationalRepositoryAdapter());
  await repository.create({ symbol: buildSymbol(), metadata });
  const updated = await repository.updateStatus({ symbolId: "BTC-USDT", status: "paused", metadata, expectedVersion: 1 });
  assert.equal(updated?.status, "paused");
  assert.equal((await repository.listByStatus(["paused"])).length, 1);
});

test("relational monitored-symbol repository preserves expected-version checks", async () => {
  const repository = new RelationalMonitoredSymbolRepository(new InMemoryMonitoredSymbolRelationalRepositoryAdapter());
  await repository.create({ symbol: buildSymbol(), metadata });
  await assert.rejects(
    () => repository.updateStatus({ symbolId: "BTC-USDT", status: "paused", metadata, expectedVersion: 2 }),
    (error: unknown) => error instanceof RepositoryError && error.code === "version_mismatch" && error.operation === "update_status"
  );
});

test("monitored-symbol relational repository composition reuses its adapter boundary", async () => {
  const repositories = composeMonitoredSymbolRelationalRepositories(new InMemoryMonitoredSymbolRelationalRepositoryAdapter());
  await repositories.monitoredSymbolRepository.create({ symbol: buildSymbol(), metadata });
  assert.equal((await repositories.monitoredSymbolRepository.getById("BTC-USDT"))?.displayName, "BTC/USDT");
});
