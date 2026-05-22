import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../src/generated/prisma/client.js";

import {
  PrismaSetupAggregateRelationalRepositoryAdapter,
  RepositoryError,
  type ProductRecordMetadata,
  type SetupAggregateRelationalPrismaClient,
  type SetupAggregateResultDurableRecord
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-aggregate-001",
  originTransitionId: "transition-aggregate-001",
  createdBySource: "research_aggregation_pipeline",
  lastUpdatedBySource: "research_aggregation_pipeline",
  traceId: "trace-aggregate-001",
  sourceObservedAtUtc: "2026-05-22T16:00:00.000Z"
};

const buildAggregateRecord = (version: number): SetupAggregateResultDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_aggregate_result",
    entityId: "aggregate-001",
    version,
    relatedEntityIds: [
      "setup-001",
      "hypothesis-001",
      "window-24h",
      "BTC-USDT",
      "ETH-USDT",
      "run-aggregate-001"
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-22T15:00:00.000Z",
  updatedAtUtc: "2026-05-22T16:00:00.000Z",
  archivedAtUtc: null,
  metadata,
  aggregateStatus: "completed",
  setupDefinitionId: "setup-001",
  researchHypothesisId: "hypothesis-001",
  aggregationScope: {
    setupDefinitionId: "setup-001",
    evaluationWindowId: "window-24h",
    symbolScope: {
      kind: "symbol_set",
      symbolIds: ["BTC-USDT", "ETH-USDT"]
    },
    timeRange: {
      startAtUtc: "2026-05-01T00:00:00.000Z",
      endAtUtc: "2026-05-31T23:59:59.000Z"
    },
    researchRunId: "run-aggregate-001",
    hypothesisId: "hypothesis-001"
  },
  scopeKey:
    'setup-001:{"setupDefinitionId":"setup-001","evaluationWindowId":"window-24h","symbolScope":{"kind":"symbol_set","symbolIds":["BTC-USDT","ETH-USDT"]},"timeRange":{"startAtUtc":"2026-05-01T00:00:00.000Z","endAtUtc":"2026-05-31T23:59:59.000Z"},"researchRunId":"run-aggregate-001","hypothesisId":"hypothesis-001"}',
  totalCandidates: 12,
  completedEvaluations: 10,
  invalidatedEvaluations: 2,
  averagePercentageMove: 1.84,
  averageAbsoluteMove: 142.5,
  averageFinalOutcome: 0.4,
  averageMaxFavorableExcursion: 2.15,
  averageMaxAdverseExcursion: -1.12,
  positiveOutcomeCount: 6,
  computedAtUtc: "2026-05-22T16:00:00.000Z",
  notes: "aggregate prisma adapter test"
});

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));
const toStringList = (value: string[] | { set: string[] } | undefined, fallback: string[]): string[] => {
  if (value === undefined) {
    return [...fallback];
  }

  return Array.isArray(value) ? [...value] : [...value.set];
};

const toPrismaAggregateRow = (record: SetupAggregateResultDurableRecord) => ({
  setupAggregateResultId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  aggregateStatus: record.aggregateStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  scopeKey: record.scopeKey,
  scopeEvaluationWindowId: record.aggregationScope.evaluationWindowId,
  scopeSymbolScopeKind: record.aggregationScope.symbolScope.kind,
  scopeSymbolIds: [...record.aggregationScope.symbolScope.symbolIds],
  scopeTimeRangeStartAtUtc: new Date(record.aggregationScope.timeRange.startAtUtc),
  scopeTimeRangeEndAtUtc: new Date(record.aggregationScope.timeRange.endAtUtc),
  scopeResearchRunId: record.aggregationScope.researchRunId ?? null,
  scopeHypothesisId: record.aggregationScope.hypothesisId ?? null,
  totalCandidates: record.totalCandidates,
  completedEvaluations: record.completedEvaluations,
  invalidatedEvaluations: record.invalidatedEvaluations,
  averagePercentageMove: record.averagePercentageMove,
  averageAbsoluteMove: record.averageAbsoluteMove,
  averageFinalOutcome: record.averageFinalOutcome,
  averageMaxFavorableExcursion: record.averageMaxFavorableExcursion,
  averageMaxAdverseExcursion: record.averageMaxAdverseExcursion,
  positiveOutcomeCount: record.positiveOutcomeCount,
  computedAtUtc: record.computedAtUtc ? new Date(record.computedAtUtc) : null,
  notes: record.notes,
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

const createFakePrismaClient = (): SetupAggregateRelationalPrismaClient => {
  const state = {
    aggregateRow: toPrismaAggregateRow(buildAggregateRecord(1)),
    setupExists: true,
    researchHypothesisExists: true
  };

  return {
    setupAggregateResultRecord: {
      async create(args: { data: Prisma.SetupAggregateResultRecordUncheckedCreateInput }) {
        state.aggregateRow = {
          setupAggregateResultId: args.data.setupAggregateResultId,
          version: args.data.version,
          lifecycleStatus: args.data.lifecycleStatus,
          aggregateStatus: args.data.aggregateStatus,
          setupDefinitionId: args.data.setupDefinitionId,
          researchHypothesisId: args.data.researchHypothesisId ?? null,
          scopeKey: args.data.scopeKey,
          scopeEvaluationWindowId: args.data.scopeEvaluationWindowId ?? null,
          scopeSymbolScopeKind: args.data.scopeSymbolScopeKind,
          scopeSymbolIds: toStringList(args.data.scopeSymbolIds, state.aggregateRow.scopeSymbolIds),
          scopeTimeRangeStartAtUtc: toRequiredDate(args.data.scopeTimeRangeStartAtUtc),
          scopeTimeRangeEndAtUtc: toRequiredDate(args.data.scopeTimeRangeEndAtUtc),
          scopeResearchRunId: args.data.scopeResearchRunId ?? null,
          scopeHypothesisId: args.data.scopeHypothesisId ?? null,
          totalCandidates: args.data.totalCandidates,
          completedEvaluations: args.data.completedEvaluations,
          invalidatedEvaluations: args.data.invalidatedEvaluations,
          averagePercentageMove: args.data.averagePercentageMove ?? null,
          averageAbsoluteMove: args.data.averageAbsoluteMove ?? null,
          averageFinalOutcome: args.data.averageFinalOutcome ?? null,
          averageMaxFavorableExcursion: args.data.averageMaxFavorableExcursion ?? null,
          averageMaxAdverseExcursion: args.data.averageMaxAdverseExcursion ?? null,
          positiveOutcomeCount: args.data.positiveOutcomeCount,
          computedAtUtc: toDateOrNull(args.data.computedAtUtc),
          notes: args.data.notes ?? null,
          originRunId: args.data.originRunId ?? null,
          originTransitionId: args.data.originTransitionId ?? null,
          createdBySource: args.data.createdBySource,
          lastUpdatedBySource: args.data.lastUpdatedBySource,
          traceId: args.data.traceId ?? null,
          sourceObservedAtUtc: toDateOrNull(args.data.sourceObservedAtUtc),
          metadataNotes: args.data.metadataNotes ?? null,
          createdAtUtc: toRequiredDate(args.data.createdAtUtc),
          updatedAtUtc: toRequiredDate(args.data.updatedAtUtc),
          archivedAtUtc: toDateOrNull(args.data.archivedAtUtc)
        };
        return state.aggregateRow;
      },
      async findFirst() {
        return state.aggregateRow;
      },
      async findMany() {
        return [state.aggregateRow];
      },
      async findUnique() {
        return state.aggregateRow;
      },
      async updateMany() {
        return { count: 1 };
      }
    },
    setupDefinitionRecord: {
      async findUnique() {
        return state.setupExists ? { setupDefinitionId: "setup-001" } : null;
      }
    },
    researchHypothesisRecord: {
      async findUnique() {
        return state.researchHypothesisExists
          ? { researchHypothesisId: "hypothesis-001" }
          : null;
      }
    }
  };
};

test("prisma aggregate adapter hydrates durable reads", async () => {
  const adapter = new PrismaSetupAggregateRelationalRepositoryAdapter(createFakePrismaClient());

  const record = await adapter.loadSetupAggregateResultRecord("aggregate-001");

  assert.equal(record?.identity.entityId, "aggregate-001");
  assert.equal(record?.aggregationScope.symbolScope.kind, "symbol_set");
  assert.deepEqual(record?.aggregationScope.symbolScope.symbolIds, ["BTC-USDT", "ETH-USDT"]);
});

test("prisma aggregate adapter maps unique-constraint failures to already_exists", async () => {
  const client = createFakePrismaClient();
  client.setupAggregateResultRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaSetupAggregateRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupAggregateResultRecord({
        record: buildAggregateRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "setup_aggregate_result"
  );
});

test("prisma aggregate adapter resolves missing setup_definition references", async () => {
  const client = createFakePrismaClient();
  client.setupAggregateResultRecord.create = async () => {
    throw { code: "P2003" };
  };
  client.setupDefinitionRecord.findUnique = async () => null;
  const adapter = new PrismaSetupAggregateRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupAggregateResultRecord({
        record: buildAggregateRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_aggregate_result" &&
      error.referenceEntityType === "setup_definition" &&
      error.referenceEntityId === "setup-001"
  );
});

test("prisma aggregate adapter resolves missing research_hypothesis references", async () => {
  const client = createFakePrismaClient();
  client.setupAggregateResultRecord.create = async () => {
    throw { code: "P2003" };
  };
  client.researchHypothesisRecord.findUnique = async () => null;
  const adapter = new PrismaSetupAggregateRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSetupAggregateResultRecord({
        record: buildAggregateRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "setup_aggregate_result" &&
      error.referenceEntityType === "research_hypothesis" &&
      error.referenceEntityId === "hypothesis-001"
  );
});

test("prisma aggregate adapter reports version mismatches on update", async () => {
  const client = createFakePrismaClient();
  client.setupAggregateResultRecord.updateMany = async () => ({ count: 0 });
  client.setupAggregateResultRecord.findUnique = async () => toPrismaAggregateRow(buildAggregateRecord(1));
  const adapter = new PrismaSetupAggregateRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.updateSetupAggregateResultRecord({
        record: buildAggregateRecord(2),
        expectedVersion: 4
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "setup_aggregate_result" &&
      error.expectedVersion === 4 &&
      error.actualVersion === 1
  );
});
