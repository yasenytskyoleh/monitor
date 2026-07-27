import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaMonitoredSymbolRelationalRepositoryAdapter,
  RepositoryError,
  type MonitoredSymbolDurableRecord,
  type MonitoredSymbolRelationalPrismaClient,
  type ProductRecordMetadata
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-monitored-symbol-prisma-001",
  originTransitionId: "transition-monitored-symbol-prisma-001",
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "trace-monitored-symbol-prisma-001",
  sourceObservedAtUtc: "2026-07-25T10:00:00.000Z"
};

const buildRecord = (symbolId: string): MonitoredSymbolDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "monitored_symbol",
    entityId: symbolId,
    version: 1,
    relatedEntityIds: []
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-25T10:00:00.000Z",
  updatedAtUtc: "2026-07-25T10:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  symbolId,
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  symbolStatus: "active",
  providerHint: "unknown",
  tags: ["primary"],
  sourceBindings: [
    {
      sourceId: "exchange-a",
      providerSymbol: "BTCUSDT",
      canonicalSymbol: symbolId,
      isPrimary: true
    }
  ]
});

type PrismaMonitoredSymbolRow = Prisma.MonitoredSymbolRecordGetPayload<object>;

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const toDate = (value: Date | string): Date =>
  value instanceof Date ? new Date(value.getTime()) : new Date(value);

const toDateOrNull = (value: Date | string | null | undefined): Date | null =>
  value === null || value === undefined ? null : toDate(value);

const toRow = (
  data: Prisma.MonitoredSymbolRecordUncheckedCreateInput
): PrismaMonitoredSymbolRow => ({
  monitoredSymbolId: data.monitoredSymbolId,
  version: data.version,
  lifecycleStatus: data.lifecycleStatus,
  symbolStatus: data.symbolStatus,
  baseAsset: data.baseAsset,
  quoteAsset: data.quoteAsset,
  displayName: data.displayName,
  marketScope: data.marketScope,
  providerHint: data.providerHint,
  tags: [...(data.tags as string[])],
  sourceBindings: copy(data.sourceBindings) as Prisma.JsonValue,
  originRunId: data.originRunId ?? null,
  originTransitionId: data.originTransitionId ?? null,
  createdBySource: data.createdBySource,
  lastUpdatedBySource: data.lastUpdatedBySource,
  traceId: data.traceId ?? null,
  sourceObservedAtUtc: toDateOrNull(data.sourceObservedAtUtc),
  metadataNotes: data.metadataNotes ?? null,
  createdAtUtc: toDate(data.createdAtUtc),
  updatedAtUtc: toDate(data.updatedAtUtc),
  archivedAtUtc: toDateOrNull(data.archivedAtUtc)
});

const createFakePrismaClient = (): MonitoredSymbolRelationalPrismaClient => {
  const rows = new Map<string, PrismaMonitoredSymbolRow>();

  return {
    monitoredSymbolRecord: {
      async create(args) {
        if (rows.has(args.data.monitoredSymbolId)) {
          throw { code: "P2002" };
        }

        const row = toRow(args.data);
        rows.set(row.monitoredSymbolId, row);
        return row;
      },
      async findMany(args) {
        return [...rows.values()]
          .filter((row) => args.where.symbolStatus.in.includes(row.symbolStatus))
          .sort((left, right) =>
            left.monitoredSymbolId.localeCompare(right.monitoredSymbolId)
          );
      },
      async findUnique(args) {
        return rows.get(args.where.monitoredSymbolId) ?? null;
      },
      async updateMany(args) {
        const row = rows.get(args.where.monitoredSymbolId);
        if (!row || (args.where.version !== undefined && row.version !== args.where.version)) {
          return { count: 0 };
        }

        const updated = toRow(
          args.data as Prisma.MonitoredSymbolRecordUncheckedCreateInput
        );
        rows.set(updated.monitoredSymbolId, updated);
        return { count: 1 };
      }
    }
  };
};

test("prisma monitored-symbol adapter persists, loads, and lists durable records", async () => {
  const adapter = new PrismaMonitoredSymbolRelationalRepositoryAdapter(createFakePrismaClient());
  const record = buildRecord("BTC-USDT");

  const inserted = await adapter.insertMonitoredSymbolRecord({
    record,
    expectedVersion: null
  });
  const byId = await adapter.loadMonitoredSymbolRecord("BTC-USDT");
  const activeRecords = await adapter.listMonitoredSymbolRecordsByStatus(["active"]);

  assert.deepEqual(inserted, record);
  assert.deepEqual(byId, record);
  assert.deepEqual(activeRecords, [record]);
});

test("prisma monitored-symbol adapter maps duplicate and stale-write failures", async () => {
  const adapter = new PrismaMonitoredSymbolRelationalRepositoryAdapter(createFakePrismaClient());
  const record = buildRecord("BTC-USDT");
  await adapter.insertMonitoredSymbolRecord({ record, expectedVersion: null });

  await assert.rejects(
    async () => adapter.insertMonitoredSymbolRecord({ record, expectedVersion: null }),
    (error: unknown) => error instanceof RepositoryError && error.code === "already_exists"
  );

  const updatedRecord: MonitoredSymbolDurableRecord = {
    ...record,
    identity: { ...record.identity, version: 2 },
    updatedAtUtc: "2026-07-25T10:01:00.000Z",
    symbolStatus: "paused"
  };
  await assert.rejects(
    async () =>
      adapter.updateMonitoredSymbolRecord({
        record: updatedRecord,
        expectedVersion: 0
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.expectedVersion === 0 &&
      error.actualVersion === 1
  );

  const updated = await adapter.updateMonitoredSymbolRecordStatus({
    record: updatedRecord,
    expectedVersion: 1
  });

  assert.equal(updated.identity.version, 2);
  assert.equal(updated.symbolStatus, "paused");
});

test("prisma monitored-symbol adapter maps retryable Prisma failures", async () => {
  const client = createFakePrismaClient();
  client.monitoredSymbolRecord.findUnique = async () => {
    throw { code: "P1001" };
  };
  const adapter = new PrismaMonitoredSymbolRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadMonitoredSymbolRecord("BTC-USDT"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.operation === "get_by_id"
  );
});
