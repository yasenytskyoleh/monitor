import { Prisma } from "../generated/prisma/client.js";
import type { MonitoredSymbolDurableRecord } from "../storage/monitored-symbol-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  MonitoredSymbolRecordWriteRequest,
  MonitoredSymbolRelationalRepositoryAdapter
} from "./monitored-symbol-relational-repository-adapter.js";

type PrismaMonitoredSymbolRecordModel =
  Prisma.MonitoredSymbolRecordGetPayload<object>;

type PrismaMonitoredSymbolRecordDelegate = {
  create(args: {
    data: Prisma.MonitoredSymbolRecordUncheckedCreateInput;
  }): Promise<PrismaMonitoredSymbolRecordModel>;
  findMany(args: {
    where: {
      symbolStatus: { in: MonitoredSymbolDurableRecord["symbolStatus"][] };
    };
    orderBy: { monitoredSymbolId: "asc" };
  }): Promise<PrismaMonitoredSymbolRecordModel[]>;
  findUnique(args: {
    where: { monitoredSymbolId: string };
  }): Promise<PrismaMonitoredSymbolRecordModel | null>;
  updateMany(args: {
    where: { monitoredSymbolId: string; version?: number };
    data: Prisma.MonitoredSymbolRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

export type MonitoredSymbolRelationalPrismaClient = {
  monitoredSymbolRecord: PrismaMonitoredSymbolRecordDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_status" | "update" | "update_status";
  entityId?: string;
  expectedVersion?: number | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P2024",
  "P2034",
  "P2037"
]);

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const normalizeJsonValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const toTimestampUtc = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;

const buildMetadata = (
  row: PrismaMonitoredSymbolRecordModel
): MonitoredSymbolDurableRecord["metadata"] => ({
  originRunId: row.originRunId,
  originTransitionId: row.originTransitionId,
  createdBySource: row.createdBySource,
  lastUpdatedBySource: row.lastUpdatedBySource,
  traceId: row.traceId,
  sourceObservedAtUtc: toTimestampUtc(row.sourceObservedAtUtc),
  ...(row.metadataNotes ? { notes: row.metadataNotes } : {})
});

const hydrateMonitoredSymbolRecord = (
  row: PrismaMonitoredSymbolRecordModel
): MonitoredSymbolDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "monitored_symbol",
    entityId: row.monitoredSymbolId,
    version: row.version,
    relatedEntityIds: []
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  symbolId: row.monitoredSymbolId,
  baseAsset: row.baseAsset,
  quoteAsset: row.quoteAsset,
  displayName: row.displayName,
  marketScope: row.marketScope,
  symbolStatus: row.symbolStatus,
  providerHint: row.providerHint,
  tags: [...row.tags],
  sourceBindings: normalizeJsonValue(
    row.sourceBindings
  ) as MonitoredSymbolDurableRecord["sourceBindings"]
});

const buildWriteData = (
  record: MonitoredSymbolDurableRecord
): Prisma.MonitoredSymbolRecordUncheckedCreateInput => ({
  monitoredSymbolId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  symbolStatus: record.symbolStatus,
  baseAsset: record.baseAsset,
  quoteAsset: record.quoteAsset,
  displayName: record.displayName,
  marketScope: record.marketScope,
  providerHint: record.providerHint,
  tags: record.tags,
  sourceBindings: normalizeJsonValue(record.sourceBindings) as Prisma.InputJsonValue,
  originRunId: record.metadata.originRunId,
  originTransitionId: record.metadata.originTransitionId,
  createdBySource: record.metadata.createdBySource,
  lastUpdatedBySource: record.metadata.lastUpdatedBySource,
  traceId: record.metadata.traceId,
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc
    ? new Date(record.metadata.sourceObservedAtUtc)
    : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const mapPrismaErrorToRepositoryError = (
  error: unknown,
  context: ErrorContext
): RepositoryError => {
  if (error instanceof RepositoryError) {
    return error;
  }

  if (isPrismaErrorWithCode(error) && error.code === "P2002") {
    return createAlreadyExistsRepositoryError({
      entityType: "monitored_symbol",
      entityId: context.entityId ?? "unknown",
      operation: context.operation
    });
  }

  const code =
    isPrismaErrorWithCode(error) && TRANSIENT_PRISMA_ERROR_CODES.has(error.code)
      ? "transient_failure"
      : "unknown_failure";

  return new RepositoryError(
    `${code} persistence failure for monitored_symbol${context.entityId ? `: ${context.entityId}` : ""}`,
    {
      code,
      operation: context.operation,
      entityType: "monitored_symbol",
      entityId: context.entityId ?? null,
      expectedVersion: context.expectedVersion ?? null,
      retryDisposition: "retryable"
    }
  );
};

export class PrismaMonitoredSymbolRelationalRepositoryAdapter
  implements MonitoredSymbolRelationalRepositoryAdapter
{
  constructor(private readonly prisma: MonitoredSymbolRelationalPrismaClient) {}

  async loadMonitoredSymbolRecord(
    symbolId: string
  ): Promise<MonitoredSymbolDurableRecord | null> {
    try {
      const row = await this.prisma.monitoredSymbolRecord.findUnique({
        where: { monitoredSymbolId: symbolId }
      });
      return row ? hydrateMonitoredSymbolRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityId: symbolId
      });
    }
  }

  async listMonitoredSymbolRecordsByStatus(
    statuses: MonitoredSymbolDurableRecord["symbolStatus"][]
  ): Promise<MonitoredSymbolDurableRecord[]> {
    try {
      const rows = await this.prisma.monitoredSymbolRecord.findMany({
        where: { symbolStatus: { in: statuses } },
        orderBy: { monitoredSymbolId: "asc" }
      });
      return rows.map((row) => hydrateMonitoredSymbolRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, { operation: "list_by_status" });
    }
  }

  async insertMonitoredSymbolRecord(
    request: MonitoredSymbolRecordWriteRequest
  ): Promise<MonitoredSymbolDurableRecord> {
    try {
      const row = await this.prisma.monitoredSymbolRecord.create({
        data: buildWriteData(request.record)
      });
      return hydrateMonitoredSymbolRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityId: request.record.identity.entityId
      });
    }
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

  private async updateRecord(
    request: MonitoredSymbolRecordWriteRequest,
    operation: "update" | "update_status"
  ): Promise<MonitoredSymbolDurableRecord> {
    const symbolId = request.record.identity.entityId;

    try {
      const result = await this.prisma.monitoredSymbolRecord.updateMany({
        where: {
          monitoredSymbolId: symbolId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildWriteData(request.record)
      });
      const row = await this.prisma.monitoredSymbolRecord.findUnique({
        where: { monitoredSymbolId: symbolId }
      });

      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "monitored_symbol",
          entityId: symbolId,
          operation
        });
      }

      if (result.count === 0 && request.expectedVersion !== null) {
        throw createVersionMismatchRepositoryError({
          entityType: "monitored_symbol",
          entityId: symbolId,
          operation,
          expectedVersion: request.expectedVersion,
          actualVersion: row.version
        });
      }

      if (result.count === 0) {
        throw new Error("unexpected update miss");
      }

      return hydrateMonitoredSymbolRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation,
        entityId: symbolId,
        expectedVersion: request.expectedVersion
      });
    }
  }
}
