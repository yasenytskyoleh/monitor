import type { MonitoredSymbol, MonitoredSymbolStatus } from "../monitoring/monitored-symbol.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type MonitoredSymbolCreateRequest = {
  symbol: MonitoredSymbol;
  metadata: ProductRecordMetadata;
};

export type MonitoredSymbolUpdateRequest = {
  symbol: MonitoredSymbol;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type MonitoredSymbolStatusUpdateRequest = {
  symbolId: string;
  status: MonitoredSymbolStatus;
  metadata: ProductRecordMetadata;
  expectedVersion: number | null;
};

export type MonitoredSymbolRepository = {
  getById(symbolId: string): Promise<MonitoredSymbol | null>;
  listByStatus(statuses: MonitoredSymbolStatus[]): Promise<MonitoredSymbol[]>;
  create(request: MonitoredSymbolCreateRequest): Promise<MonitoredSymbol>;
  update(request: MonitoredSymbolUpdateRequest): Promise<MonitoredSymbol>;
  updateStatus(request: MonitoredSymbolStatusUpdateRequest): Promise<MonitoredSymbol | null>;
};
