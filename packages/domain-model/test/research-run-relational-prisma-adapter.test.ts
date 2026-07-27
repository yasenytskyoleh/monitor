import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaResearchRunRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type ResearchRunDurableRecord,
  type ResearchRunRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-research-run-prisma-001",
  originTransitionId: "transition-research-run-prisma-001",
  createdBySource: "evaluation_pipeline",
  lastUpdatedBySource: "evaluation_pipeline",
  traceId: "trace-research-run-prisma-001",
  sourceObservedAtUtc: "2026-07-27T10:00:00.000Z"
};

const buildRecord = (runId: string): ResearchRunDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_run",
    entityId: runId,
    version: 1,
    relatedEntityIds: ["hypothesis-001", "setup-001", "candidate-001", "result-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-07-27T10:00:00.000Z",
  updatedAtUtc: "2026-07-27T10:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  researchRunStatus: "running",
  hypothesisId: "hypothesis-001",
  setupId: "setup-001",
  candidateIds: ["candidate-001"],
  evaluationWindowIds: ["window-001"],
  evaluationResultIds: ["result-001"],
  startedAtUtc: "2026-07-27T10:00:00.000Z",
  completedAtUtc: null,
  summary: null
});

type PrismaResearchRunRow = Prisma.ResearchRunRecordGetPayload<object>;

const toDate = (value: Date | string): Date =>
  value instanceof Date ? new Date(value.getTime()) : new Date(value);

const toDateOrNull = (value: Date | string | null | undefined): Date | null =>
  value === null || value === undefined ? null : toDate(value);

const toRow = (
  data: Prisma.ResearchRunRecordUncheckedCreateInput
): PrismaResearchRunRow => ({
  researchRunId: data.researchRunId,
  version: data.version,
  lifecycleStatus: data.lifecycleStatus,
  researchRunStatus: data.researchRunStatus,
  hypothesisId: data.hypothesisId,
  setupId: data.setupId,
  candidateIds: [...(data.candidateIds as string[])],
  evaluationWindowIds: [...(data.evaluationWindowIds as string[])],
  evaluationResultIds: [...(data.evaluationResultIds as string[])],
  startedAtUtc: toDate(data.startedAtUtc),
  completedAtUtc: toDateOrNull(data.completedAtUtc),
  summary: data.summary ?? null,
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

const createFakePrismaClient = (): ResearchRunRelationalPrismaClient => {
  const rows = new Map<string, PrismaResearchRunRow>();

  return {
    researchRunRecord: {
      async create(args) {
        if (rows.has(args.data.researchRunId)) {
          throw { code: "P2002" };
        }

        const row = toRow(args.data);
        rows.set(row.researchRunId, row);
        return row;
      },
      async findMany(args) {
        return [...rows.values()]
          .filter((row) =>
            args.where.hypothesisId
              ? row.hypothesisId === args.where.hypothesisId
              : args.where.researchRunStatus?.in.includes(row.researchRunStatus)
          )
          .sort((left, right) => left.researchRunId.localeCompare(right.researchRunId));
      },
      async findUnique(args) {
        return rows.get(args.where.researchRunId) ?? null;
      },
      async updateMany(args) {
        const row = rows.get(args.where.researchRunId);
        if (!row || (args.where.version !== undefined && row.version !== args.where.version)) {
          return { count: 0 };
        }

        const updated = toRow(
          args.data as Prisma.ResearchRunRecordUncheckedCreateInput
        );
        rows.set(updated.researchRunId, updated);
        return { count: 1 };
      }
    }
  };
};

test("prisma research-run adapter persists, loads, and lists durable records", async () => {
  const adapter = new PrismaResearchRunRelationalRepositoryAdapter(createFakePrismaClient());
  const record = buildRecord("research-run-001");

  const inserted = await adapter.insertResearchRunRecord({
    record,
    expectedVersion: null
  });
  const byId = await adapter.loadResearchRunRecord("research-run-001");
  const byHypothesis = await adapter.listResearchRunRecordsByHypothesisId("hypothesis-001");
  const runningRecords = await adapter.listResearchRunRecordsByStatus(["running"]);

  assert.deepEqual(inserted, record);
  assert.deepEqual(byId, record);
  assert.deepEqual(byHypothesis, [record]);
  assert.deepEqual(runningRecords, [record]);
});

test("prisma research-run adapter maps duplicate and stale-write failures", async () => {
  const adapter = new PrismaResearchRunRelationalRepositoryAdapter(createFakePrismaClient());
  const record = buildRecord("research-run-001");
  await adapter.insertResearchRunRecord({ record, expectedVersion: null });

  await assert.rejects(
    async () => adapter.insertResearchRunRecord({ record, expectedVersion: null }),
    (error: unknown) => error instanceof RepositoryError && error.code === "already_exists"
  );

  const updatedRecord: ResearchRunDurableRecord = {
    ...record,
    identity: { ...record.identity, version: 2 },
    updatedAtUtc: "2026-07-27T10:01:00.000Z",
    researchRunStatus: "completed",
    completedAtUtc: "2026-07-27T10:01:00.000Z",
    summary: "completed"
  };
  await assert.rejects(
    async () =>
      adapter.updateResearchRunRecord({
        record: updatedRecord,
        expectedVersion: 0
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.expectedVersion === 0 &&
      error.actualVersion === 1
  );

  const updated = await adapter.updateResearchRunRecord({
    record: updatedRecord,
    expectedVersion: 1
  });

  assert.equal(updated.identity.version, 2);
  assert.equal(updated.researchRunStatus, "completed");
});

test("prisma research-run adapter maps retryable Prisma failures", async () => {
  const client = createFakePrismaClient();
  client.researchRunRecord.findUnique = async () => {
    throw { code: "P1001" };
  };
  const adapter = new PrismaResearchRunRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () => adapter.loadResearchRunRecord("research-run-001"),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "transient_failure" &&
      error.operation === "get_by_id"
  );
});
