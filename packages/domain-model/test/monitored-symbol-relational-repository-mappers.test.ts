import assert from "node:assert/strict";
import test from "node:test";

import {
  dehydrateMonitoredSymbolToDurableRecord,
  hydrateMonitoredSymbolFromDurableRecord,
  type MonitoredSymbol,
  type ProductRecordMetadata
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-07-24T12:00:00.000Z",
  notes: "mapper contract test"
};

const buildSymbol = (status: MonitoredSymbol["status"]): MonitoredSymbol => ({
  symbolId: "BTC-USDT",
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status,
  providerHint: "exchange_adapter_pending",
  tags: ["primary", "liquid"],
  sourceBindings: [
    {
      sourceId: "exchange-a",
      providerSymbol: "BTCUSDT",
      canonicalSymbol: "BTC-USDT",
      isPrimary: true
    }
  ],
  createdAtUtc: "2026-07-24T08:00:00.000Z",
  updatedAtUtc: "2026-07-24T12:00:00.000Z"
});

test("monitored-symbol mapper round-trips catalog fields and metadata", () => {
  const symbol = buildSymbol("active");
  const record = dehydrateMonitoredSymbolToDurableRecord(symbol, metadata, 2);

  assert.equal(record.identity.entityId, symbol.symbolId);
  assert.equal(record.identity.version, 2);
  assert.deepEqual(record.identity.relatedEntityIds, []);
  assert.equal(record.lifecycleStatus, "active");
  assert.equal(record.archivedAtUtc, null);
  assert.equal(record.metadata.notes, "mapper contract test");
  assert.deepEqual(hydrateMonitoredSymbolFromDurableRecord(record), symbol);
});

test("monitored-symbol mapper derives archive lifecycle fields from archived status", () => {
  const symbol = buildSymbol("archived");
  const record = dehydrateMonitoredSymbolToDurableRecord(symbol, metadata, 3);

  assert.equal(record.lifecycleStatus, "archived");
  assert.equal(record.archivedAtUtc, symbol.updatedAtUtc);
  assert.equal(record.symbolStatus, "archived");
});
