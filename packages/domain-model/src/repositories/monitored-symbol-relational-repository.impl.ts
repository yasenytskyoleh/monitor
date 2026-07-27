import type { MonitoredSymbol } from "../monitoring/monitored-symbol.js";
import type { MonitoredSymbolDurableRecord } from "../storage/monitored-symbol-relational-slice.js";
import type {
  MonitoredSymbolCreateRequest,
  MonitoredSymbolRepository,
  MonitoredSymbolStatusUpdateRequest,
  MonitoredSymbolUpdateRequest
} from "./monitored-symbol-repository.js";
import type { MonitoredSymbolRelationalRepositoryAdapter } from "./monitored-symbol-relational-repository-adapter.js";
import {
  dehydrateMonitoredSymbolToDurableRecord,
  hydrateMonitoredSymbolFromDurableRecord
} from "./monitored-symbol-relational-repository-mappers.js";
import { createNotFoundRepositoryError } from "./repository-error.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextRecord = (
  symbol: MonitoredSymbol,
  metadata: MonitoredSymbolUpdateRequest["metadata"] | MonitoredSymbolStatusUpdateRequest["metadata"],
  currentRecord: MonitoredSymbolDurableRecord
): MonitoredSymbolDurableRecord =>
  dehydrateMonitoredSymbolToDurableRecord(symbol, metadata, currentRecord.identity.version + 1);

export class RelationalMonitoredSymbolRepository implements MonitoredSymbolRepository {
  constructor(private readonly adapter: MonitoredSymbolRelationalRepositoryAdapter) {}

  async getById(symbolId: string): Promise<MonitoredSymbol | null> {
    const record = await this.adapter.loadMonitoredSymbolRecord(symbolId);
    return record ? hydrateMonitoredSymbolFromDurableRecord(record) : null;
  }

  async listByStatus(statuses: MonitoredSymbol["status"][]): Promise<MonitoredSymbol[]> {
    const records = await this.adapter.listMonitoredSymbolRecordsByStatus(statuses);
    return records.map(hydrateMonitoredSymbolFromDurableRecord);
  }

  async create(request: MonitoredSymbolCreateRequest): Promise<MonitoredSymbol> {
    const record = await this.adapter.insertMonitoredSymbolRecord({
      record: dehydrateMonitoredSymbolToDurableRecord(request.symbol, request.metadata, 1),
      expectedVersion: null
    });
    return hydrateMonitoredSymbolFromDurableRecord(record);
  }

  async update(request: MonitoredSymbolUpdateRequest): Promise<MonitoredSymbol> {
    const currentRecord = await this.adapter.loadMonitoredSymbolRecord(request.symbol.symbolId);
    if (!currentRecord) throw createNotFoundRepositoryError({ entityType: "monitored_symbol", entityId: request.symbol.symbolId, operation: "update" });
    const record = await this.adapter.updateMonitoredSymbolRecord({
      record: buildNextRecord(request.symbol, request.metadata, currentRecord), expectedVersion: request.expectedVersion
    });
    return hydrateMonitoredSymbolFromDurableRecord(record);
  }

  async updateStatus(request: MonitoredSymbolStatusUpdateRequest): Promise<MonitoredSymbol | null> {
    const currentRecord = await this.adapter.loadMonitoredSymbolRecord(request.symbolId);
    if (!currentRecord) return null;
    const record = await this.adapter.updateMonitoredSymbolRecordStatus({
      record: buildNextRecord({ ...hydrateMonitoredSymbolFromDurableRecord(currentRecord), status: request.status, updatedAtUtc: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc) }, request.metadata, currentRecord),
      expectedVersion: request.expectedVersion
    });
    return hydrateMonitoredSymbolFromDurableRecord(record);
  }
}
