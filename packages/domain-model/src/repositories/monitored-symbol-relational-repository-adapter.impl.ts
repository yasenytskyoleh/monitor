import type { MonitoredSymbolDurableRecord } from "../storage/monitored-symbol-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  MonitoredSymbolRecordWriteRequest,
  MonitoredSymbolRelationalRepositoryAdapter
} from "./monitored-symbol-relational-repository-adapter.js";

const cloneRecord = (record: MonitoredSymbolDurableRecord): MonitoredSymbolDurableRecord =>
  structuredClone(record);

export class InMemoryMonitoredSymbolRelationalRepositoryAdapter
  implements MonitoredSymbolRelationalRepositoryAdapter
{
  private readonly recordsBySymbolId = new Map<string, MonitoredSymbolDurableRecord>();

  async loadMonitoredSymbolRecord(symbolId: string): Promise<MonitoredSymbolDurableRecord | null> {
    const record = this.recordsBySymbolId.get(symbolId);
    return record ? cloneRecord(record) : null;
  }

  async listMonitoredSymbolRecordsByStatus(
    statuses: MonitoredSymbolDurableRecord["symbolStatus"][]
  ): Promise<MonitoredSymbolDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsBySymbolId.values()]
      .filter((record) => allowedStatuses.has(record.symbolStatus))
      .map(cloneRecord);
  }

  async insertMonitoredSymbolRecord(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord> {
    const symbolId = request.record.identity.entityId;
    if (this.recordsBySymbolId.has(symbolId)) {
      throw createAlreadyExistsRepositoryError({ entityType: "monitored_symbol", entityId: symbolId, operation: "create" });
    }

    const record = cloneRecord(request.record);
    this.recordsBySymbolId.set(symbolId, record);
    return cloneRecord(record);
  }

  async updateMonitoredSymbolRecord(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord> {
    return this.updateRecord(request, "update");
  }

  async updateMonitoredSymbolRecordStatus(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord> {
    return this.updateRecord(request, "update_status");
  }

  private updateRecord(
    request: MonitoredSymbolRecordWriteRequest,
    operation: "update" | "update_status"
  ): MonitoredSymbolDurableRecord {
    const symbolId = request.record.identity.entityId;
    const currentRecord = this.recordsBySymbolId.get(symbolId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({ entityType: "monitored_symbol", entityId: symbolId, operation });
    }
    if (request.expectedVersion !== null && request.expectedVersion !== currentRecord.identity.version) {
      throw createVersionMismatchRepositoryError({ entityType: "monitored_symbol", entityId: symbolId, operation, expectedVersion: request.expectedVersion, actualVersion: currentRecord.identity.version });
    }

    const record = cloneRecord(request.record);
    this.recordsBySymbolId.set(symbolId, record);
    return cloneRecord(record);
  }
}
