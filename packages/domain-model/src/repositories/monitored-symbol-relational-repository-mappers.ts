import type { MonitoredSymbol } from "../monitoring/monitored-symbol.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type MonitoredSymbolDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const MONITORED_SYMBOL_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export const hydrateMonitoredSymbolFromDurableRecord = (
  record: MonitoredSymbolDurableRecord
): MonitoredSymbol => ({
  symbolId: record.symbolId,
  baseAsset: record.baseAsset,
  quoteAsset: record.quoteAsset,
  displayName: record.displayName,
  marketScope: record.marketScope,
  status: record.symbolStatus,
  providerHint: record.providerHint,
  tags: structuredClone(record.tags),
  sourceBindings: structuredClone(record.sourceBindings),
  createdAtUtc: record.createdAtUtc,
  updatedAtUtc: record.updatedAtUtc
});

export const dehydrateMonitoredSymbolToDurableRecord = (
  symbol: MonitoredSymbol,
  metadata: ProductRecordMetadata,
  version: number
): MonitoredSymbolDurableRecord => {
  const isArchived = symbol.status === "archived";

  return {
    storageSchemaVersion: MONITORED_SYMBOL_SCHEMA_VERSION,
    identity: {
      boundary: "product_domain",
      entityType: "monitored_symbol",
      entityId: symbol.symbolId,
      version,
      relatedEntityIds: []
    },
    lifecycleStatus: isArchived ? "archived" : "active",
    createdAtUtc: symbol.createdAtUtc,
    updatedAtUtc: symbol.updatedAtUtc,
    archivedAtUtc: isArchived ? symbol.updatedAtUtc : null,
    metadata: cloneMetadata(metadata),
    symbolId: symbol.symbolId,
    baseAsset: symbol.baseAsset,
    quoteAsset: symbol.quoteAsset,
    displayName: symbol.displayName,
    marketScope: symbol.marketScope,
    symbolStatus: symbol.status,
    providerHint: symbol.providerHint,
    tags: structuredClone(symbol.tags),
    sourceBindings: structuredClone(symbol.sourceBindings)
  };
};
