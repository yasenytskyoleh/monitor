import {
  MARKET_SCOPES,
  MONITORED_SYMBOL_STATUSES,
  MONITOR_PROVIDER_HINTS,
  type MonitoredSymbol
} from "../monitoring/monitored-symbol.js";
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

export class MonitoringCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonitoringCatalogValidationError";
  }
}

const assertNonEmptyString = (value: string, fieldName: string): void => {
  if (!value.trim()) {
    throw new MonitoringCatalogValidationError(`${fieldName} is required`);
  }
};

const validateMonitoredSymbol = (symbol: MonitoredSymbol): void => {
  assertNonEmptyString(symbol.symbolId, "symbolId");
  assertNonEmptyString(symbol.baseAsset, "baseAsset");
  assertNonEmptyString(symbol.quoteAsset, "quoteAsset");
  assertNonEmptyString(symbol.displayName, "displayName");

  if (!MARKET_SCOPES.includes(symbol.marketScope)) {
    throw new MonitoringCatalogValidationError(`invalid marketScope: ${symbol.marketScope}`);
  }

  if (!MONITORED_SYMBOL_STATUSES.includes(symbol.status)) {
    throw new MonitoringCatalogValidationError(`invalid monitored_symbol status: ${symbol.status}`);
  }

  if (!MONITOR_PROVIDER_HINTS.includes(symbol.providerHint)) {
    throw new MonitoringCatalogValidationError(`invalid providerHint: ${symbol.providerHint}`);
  }
};

export const createMonitoringCatalogService = (
  dependencies: MonitoringCatalogServiceDependencies
): MonitoringCatalogService => {
  const { monitoredSymbolRepository } = dependencies;

  return {
    async registerMonitoredSymbol(request) {
      validateMonitoredSymbol(request.symbol);
      return monitoredSymbolRepository.create(request);
    },
    async updateMonitoredSymbolStatus(request) {
      if (!MONITORED_SYMBOL_STATUSES.includes(request.status)) {
        throw new MonitoringCatalogValidationError(
          `invalid monitored_symbol status: ${request.status}`
        );
      }

      return monitoredSymbolRepository.updateStatus({
        ...request,
        expectedVersion: null
      });
    }
  };
};
