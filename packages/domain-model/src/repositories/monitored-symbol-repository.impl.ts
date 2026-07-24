import type {
  MonitoredSymbolCreateRequest,
  MonitoredSymbolRepository,
  MonitoredSymbolStatusUpdateRequest,
  MonitoredSymbolUpdateRequest
} from "./monitored-symbol-repository.js";
import type { MonitoredSymbol } from "../monitoring/monitored-symbol.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  type RepositoryOperation
} from "./repository-error.js";

type PersistedMonitoredSymbolRecord = {
  symbol: MonitoredSymbol;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneSymbol = (symbol: MonitoredSymbol): MonitoredSymbol => structuredClone(symbol);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedMonitoredSymbolRecord,
  expectedVersion: number | null,
  symbolId: string,
  operation: RepositoryOperation
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw createVersionMismatchRepositoryError({
      entityType: "monitored_symbol",
      entityId: symbolId,
      operation,
      expectedVersion,
      actualVersion: record.version
    });
  }
};

const buildUpdatedTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemoryMonitoredSymbolRepository implements MonitoredSymbolRepository {
  private readonly recordsBySymbolId = new Map<string, PersistedMonitoredSymbolRecord>();

  async getById(symbolId: string): Promise<MonitoredSymbol | null> {
    const record = this.recordsBySymbolId.get(symbolId);
    return record ? cloneSymbol(record.symbol) : null;
  }

  async listByStatus(statuses: MonitoredSymbol["status"][]): Promise<MonitoredSymbol[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsBySymbolId.values()]
      .filter((record) => allowedStatuses.has(record.symbol.status))
      .map((record) => cloneSymbol(record.symbol));
  }

  async create(request: MonitoredSymbolCreateRequest): Promise<MonitoredSymbol> {
    const symbolId = request.symbol.symbolId;
    if (this.recordsBySymbolId.has(symbolId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "monitored_symbol",
        entityId: symbolId,
        operation: "create"
      });
    }

    const symbol = cloneSymbol(request.symbol);
    this.recordsBySymbolId.set(symbolId, {
      symbol,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSymbol(symbol);
  }

  async update(request: MonitoredSymbolUpdateRequest): Promise<MonitoredSymbol> {
    const symbolId = request.symbol.symbolId;
    const currentRecord = this.recordsBySymbolId.get(symbolId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "monitored_symbol",
        entityId: symbolId,
        operation: "update"
      });
    }

    assertExpectedVersion(currentRecord, request.expectedVersion, symbolId, "update");

    const symbol = cloneSymbol(request.symbol);
    this.recordsBySymbolId.set(symbolId, {
      symbol,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSymbol(symbol);
  }

  async updateStatus(request: MonitoredSymbolStatusUpdateRequest): Promise<MonitoredSymbol | null> {
    const currentRecord = this.recordsBySymbolId.get(request.symbolId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(currentRecord, request.expectedVersion, request.symbolId, "update_status");

    const symbol: MonitoredSymbol = {
      ...currentRecord.symbol,
      status: request.status,
      updatedAtUtc: buildUpdatedTimestamp(request.metadata)
    };
    this.recordsBySymbolId.set(request.symbolId, {
      symbol,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneSymbol(symbol);
  }
}
