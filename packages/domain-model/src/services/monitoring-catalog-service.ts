import type { MonitoredSymbol } from "../monitoring/monitored-symbol.js";
import type { MonitoredSymbolRepository } from "../repositories/monitored-symbol-repository.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type RegisterMonitoredSymbolRequest = {
  symbol: MonitoredSymbol;
  metadata: ProductRecordMetadata;
};

export type UpdateMonitoredSymbolStatusRequest = {
  symbolId: string;
  status: MonitoredSymbol["status"];
  metadata: ProductRecordMetadata;
};

export type MonitoringCatalogServiceDependencies = {
  monitoredSymbolRepository: MonitoredSymbolRepository;
};

export type MonitoringCatalogService = {
  registerMonitoredSymbol(request: RegisterMonitoredSymbolRequest): Promise<MonitoredSymbol>;
  updateMonitoredSymbolStatus(request: UpdateMonitoredSymbolStatusRequest): Promise<MonitoredSymbol | null>;
};
