import assert from "node:assert/strict";
import test from "node:test";

import {
  PrismaSignalEvaluationRelationalRepositoryAdapter,
  RepositoryError,
  type EvaluationResultDurableRecord,
  type ProductRecordMetadata,
  type SignalCandidateDurableRecord,
  type SignalEvaluationRelationalPrismaClient
} from "../src/index.js";

const metadata: ProductRecordMetadata = {
  originRunId: "run-001",
  originTransitionId: "transition-001",
  createdBySource: "detection_pipeline",
  lastUpdatedBySource: "evaluation_pipeline",
  traceId: "trace-001",
  sourceObservedAtUtc: "2026-05-22T09:00:00.000Z"
};

const buildSignalCandidateRecord = (version: number): SignalCandidateDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "signal_candidate",
    entityId: "candidate-001",
    version,
    relatedEntityIds: ["setup-001", "setup-001-rev-001", "BTC-USDT", "hit-001"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-22T09:00:00.000Z",
  updatedAtUtc: "2026-05-22T09:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  candidateStatus: "under_review",
  setupDefinitionId: "setup-001",
  setupRevisionId: "setup-001-rev-001",
  monitoredSymbolId: "BTC-USDT",
  detectionHitId: "hit-001",
  detectedAtUtc: "2026-05-22T09:00:00.000Z",
  evidenceSummary: "4h breakout retest with volume expansion",
  candidateOriginRunId: "run-detection-001"
});

const buildEvaluationResultRecord = (version: number): EvaluationResultDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "evaluation_result",
    entityId: "result-001",
    version,
    relatedEntityIds: ["candidate-001", "window-24h"]
  },
  lifecycleStatus: "active",
  createdAtUtc: "2026-05-22T09:30:00.000Z",
  updatedAtUtc: "2026-05-23T09:30:00.000Z",
  archivedAtUtc: null,
  metadata,
  evaluationStatus: "completed",
  signalCandidateId: "candidate-001",
  evaluationWindowId: "window-24h",
  referencePrice: 65000,
  finalPrice: 65800,
  highInWindow: 66400,
  lowInWindow: 64100,
  absoluteMove: 800,
  percentageMove: 1.230769,
  maxFavorableExcursion: 2.15,
  maxAdverseExcursion: -1.38,
  evaluatedAtUtc: "2026-05-23T09:30:00.000Z",
  notes: "completed via prisma adapter test"
});

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const toRequiredDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const toPrismaSignalCandidateRow = (record: SignalCandidateDurableRecord) => ({
  signalCandidateId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  candidateStatus: record.candidateStatus,
  setupDefinitionId: record.setupDefinitionId,
  setupRevisionId: record.setupRevisionId,
  monitoredSymbolId: record.monitoredSymbolId,
  detectionHitId: record.detectionHitId,
  detectedAtUtc: new Date(record.detectedAtUtc),
  evidenceSummary: record.evidenceSummary,
  candidateOriginRunId: record.candidateOriginRunId,
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

const toPrismaEvaluationResultRow = (record: EvaluationResultDurableRecord) => ({
  evaluationResultId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  evaluationStatus: record.evaluationStatus,
  signalCandidateId: record.signalCandidateId,
  evaluationWindowId: record.evaluationWindowId,
  referencePrice: record.referencePrice,
  finalPrice: record.finalPrice,
  highInWindow: record.highInWindow,
  lowInWindow: record.lowInWindow,
  absoluteMove: record.absoluteMove,
  percentageMove: record.percentageMove,
  maxFavorableExcursion: record.maxFavorableExcursion,
  maxAdverseExcursion: record.maxAdverseExcursion,
  evaluatedAtUtc: record.evaluatedAtUtc ? new Date(record.evaluatedAtUtc) : null,
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

const createFakePrismaClient = (): SignalEvaluationRelationalPrismaClient => {
  const signalCandidateRows = new Map([
    ["candidate-001", toPrismaSignalCandidateRow(buildSignalCandidateRecord(1))]
  ]);
  const evaluationResultRows = new Map([
    ["result-001", toPrismaEvaluationResultRow(buildEvaluationResultRecord(1))]
  ]);

  return {
    signalCandidateRecord: {
      async create(args: any) {
        const data = args.data;
        const row = {
          signalCandidateId: data.signalCandidateId,
          version: data.version,
          lifecycleStatus: data.lifecycleStatus,
          candidateStatus: data.candidateStatus,
          setupDefinitionId: data.setupDefinitionId,
          setupRevisionId: data.setupRevisionId,
          monitoredSymbolId: data.monitoredSymbolId,
          detectionHitId: data.detectionHitId ?? null,
          detectedAtUtc: toRequiredDate(data.detectedAtUtc),
          evidenceSummary: data.evidenceSummary,
          candidateOriginRunId: data.candidateOriginRunId ?? null,
          originRunId: data.originRunId ?? null,
          originTransitionId: data.originTransitionId ?? null,
          createdBySource: data.createdBySource,
          lastUpdatedBySource: data.lastUpdatedBySource,
          traceId: data.traceId ?? null,
          sourceObservedAtUtc: toDateOrNull(data.sourceObservedAtUtc),
          metadataNotes: data.metadataNotes ?? null,
          createdAtUtc: toRequiredDate(data.createdAtUtc),
          updatedAtUtc: toRequiredDate(data.updatedAtUtc),
          archivedAtUtc: toDateOrNull(data.archivedAtUtc)
        };
        signalCandidateRows.set(row.signalCandidateId, row);
        return row;
      },
      async findMany(args: any) {
        const rows = [...signalCandidateRows.values()];
        const where = args.where;
        const filtered =
          "setupDefinitionId" in where
            ? rows.filter((row) => row.setupDefinitionId === where.setupDefinitionId)
            : "monitoredSymbolId" in where
              ? rows.filter((row) => row.monitoredSymbolId === where.monitoredSymbolId)
              : rows.filter((row) => where.candidateStatus.in.includes(row.candidateStatus));
        return filtered.sort((left, right) =>
          left.signalCandidateId.localeCompare(right.signalCandidateId)
        );
      },
      async findUnique(args: any) {
        return signalCandidateRows.get(args.where.signalCandidateId) ?? null;
      },
      async updateMany(args: any) {
        const { data, where } = args;
        const current = signalCandidateRows.get(where.signalCandidateId);
        if (!current) {
          return { count: 0 };
        }

        if (where.version !== undefined && current.version !== where.version) {
          return { count: 0 };
        }

        signalCandidateRows.set(where.signalCandidateId, {
          ...current,
          version: typeof data.version === "number" ? data.version : current.version,
          lifecycleStatus: data.lifecycleStatus ?? current.lifecycleStatus,
          candidateStatus: data.candidateStatus ?? current.candidateStatus,
          setupDefinitionId: data.setupDefinitionId ?? current.setupDefinitionId,
          setupRevisionId: data.setupRevisionId ?? current.setupRevisionId,
          monitoredSymbolId: data.monitoredSymbolId ?? current.monitoredSymbolId,
          detectionHitId: data.detectionHitId ?? current.detectionHitId,
          detectedAtUtc: data.detectedAtUtc
            ? toRequiredDate(data.detectedAtUtc as Date | string)
            : current.detectedAtUtc,
          evidenceSummary: data.evidenceSummary ?? current.evidenceSummary,
          candidateOriginRunId: data.candidateOriginRunId ?? current.candidateOriginRunId,
          originRunId: data.originRunId ?? current.originRunId,
          originTransitionId: data.originTransitionId ?? current.originTransitionId,
          createdBySource: data.createdBySource ?? current.createdBySource,
          lastUpdatedBySource: data.lastUpdatedBySource ?? current.lastUpdatedBySource,
          traceId: data.traceId ?? current.traceId,
          sourceObservedAtUtc:
            data.sourceObservedAtUtc !== undefined
              ? toDateOrNull(data.sourceObservedAtUtc as Date | string | null)
              : current.sourceObservedAtUtc,
          metadataNotes: data.metadataNotes ?? current.metadataNotes,
          createdAtUtc: data.createdAtUtc
            ? toRequiredDate(data.createdAtUtc as Date | string)
            : current.createdAtUtc,
          updatedAtUtc: data.updatedAtUtc
            ? toRequiredDate(data.updatedAtUtc as Date | string)
            : current.updatedAtUtc,
          archivedAtUtc:
            data.archivedAtUtc !== undefined
              ? toDateOrNull(data.archivedAtUtc as Date | string | null)
              : current.archivedAtUtc
        });

        return { count: 1 };
      }
    },
    evaluationResultRecord: {
      async create(args: any) {
        const data = args.data;
        const row = {
          evaluationResultId: data.evaluationResultId,
          version: data.version,
          lifecycleStatus: data.lifecycleStatus,
          evaluationStatus: data.evaluationStatus,
          signalCandidateId: data.signalCandidateId,
          evaluationWindowId: data.evaluationWindowId,
          referencePrice: data.referencePrice ?? null,
          finalPrice: data.finalPrice ?? null,
          highInWindow: data.highInWindow ?? null,
          lowInWindow: data.lowInWindow ?? null,
          absoluteMove: data.absoluteMove ?? null,
          percentageMove: data.percentageMove ?? null,
          maxFavorableExcursion: data.maxFavorableExcursion ?? null,
          maxAdverseExcursion: data.maxAdverseExcursion ?? null,
          evaluatedAtUtc: toDateOrNull(data.evaluatedAtUtc),
          notes: data.notes ?? null,
          originRunId: data.originRunId ?? null,
          originTransitionId: data.originTransitionId ?? null,
          createdBySource: data.createdBySource,
          lastUpdatedBySource: data.lastUpdatedBySource,
          traceId: data.traceId ?? null,
          sourceObservedAtUtc: toDateOrNull(data.sourceObservedAtUtc),
          metadataNotes: data.metadataNotes ?? null,
          createdAtUtc: toRequiredDate(data.createdAtUtc),
          updatedAtUtc: toRequiredDate(data.updatedAtUtc),
          archivedAtUtc: toDateOrNull(data.archivedAtUtc)
        };
        evaluationResultRows.set(row.evaluationResultId, row);
        return row;
      },
      async findFirst(args: any) {
        return (
          [...evaluationResultRows.values()].find(
            (row) =>
              row.signalCandidateId === args.where.signalCandidateId &&
              row.evaluationWindowId === args.where.evaluationWindowId
          ) ?? null
        );
      },
      async findMany(args: any) {
        const rows = [...evaluationResultRows.values()];
        const where = args.where;
        const filtered =
          "signalCandidateId" in where
            ? rows.filter((row) => row.signalCandidateId === where.signalCandidateId)
            : "evaluationWindowId" in where
              ? rows.filter((row) => row.evaluationWindowId === where.evaluationWindowId)
              : rows.filter((row) => where.evaluationStatus.in.includes(row.evaluationStatus));
        return filtered.sort((left, right) =>
          left.evaluationResultId.localeCompare(right.evaluationResultId)
        );
      },
      async findUnique(args: any) {
        return evaluationResultRows.get(args.where.evaluationResultId) ?? null;
      },
      async updateMany(args: any) {
        const { data, where } = args;
        const current = evaluationResultRows.get(where.evaluationResultId);
        if (!current) {
          return { count: 0 };
        }

        if (where.version !== undefined && current.version !== where.version) {
          return { count: 0 };
        }

        evaluationResultRows.set(where.evaluationResultId, {
          ...current,
          version: typeof data.version === "number" ? data.version : current.version,
          lifecycleStatus: data.lifecycleStatus ?? current.lifecycleStatus,
          evaluationStatus: data.evaluationStatus ?? current.evaluationStatus,
          signalCandidateId: data.signalCandidateId ?? current.signalCandidateId,
          evaluationWindowId: data.evaluationWindowId ?? current.evaluationWindowId,
          referencePrice: data.referencePrice ?? current.referencePrice,
          finalPrice: data.finalPrice ?? current.finalPrice,
          highInWindow: data.highInWindow ?? current.highInWindow,
          lowInWindow: data.lowInWindow ?? current.lowInWindow,
          absoluteMove: data.absoluteMove ?? current.absoluteMove,
          percentageMove: data.percentageMove ?? current.percentageMove,
          maxFavorableExcursion: data.maxFavorableExcursion ?? current.maxFavorableExcursion,
          maxAdverseExcursion: data.maxAdverseExcursion ?? current.maxAdverseExcursion,
          evaluatedAtUtc:
            data.evaluatedAtUtc !== undefined
              ? toDateOrNull(data.evaluatedAtUtc as Date | string | null)
              : current.evaluatedAtUtc,
          notes: data.notes ?? current.notes,
          originRunId: data.originRunId ?? current.originRunId,
          originTransitionId: data.originTransitionId ?? current.originTransitionId,
          createdBySource: data.createdBySource ?? current.createdBySource,
          lastUpdatedBySource: data.lastUpdatedBySource ?? current.lastUpdatedBySource,
          traceId: data.traceId ?? current.traceId,
          sourceObservedAtUtc:
            data.sourceObservedAtUtc !== undefined
              ? toDateOrNull(data.sourceObservedAtUtc as Date | string | null)
              : current.sourceObservedAtUtc,
          metadataNotes: data.metadataNotes ?? current.metadataNotes,
          createdAtUtc: data.createdAtUtc
            ? toRequiredDate(data.createdAtUtc as Date | string)
            : current.createdAtUtc,
          updatedAtUtc: data.updatedAtUtc
            ? toRequiredDate(data.updatedAtUtc as Date | string)
            : current.updatedAtUtc,
          archivedAtUtc:
            data.archivedAtUtc !== undefined
              ? toDateOrNull(data.archivedAtUtc as Date | string | null)
              : current.archivedAtUtc
        });

        return { count: 1 };
      }
    }
  };
};

test("prisma adapter hydrates signal-candidate reads", async () => {
  const adapter = new PrismaSignalEvaluationRelationalRepositoryAdapter(createFakePrismaClient());

  const record = await adapter.loadSignalCandidateRecord("candidate-001");

  assert.equal(record?.identity.entityId, "candidate-001");
  assert.equal(record?.candidateOriginRunId, "run-detection-001");
});

test("prisma adapter hydrates evaluation-result lookups by candidate/window", async () => {
  const adapter = new PrismaSignalEvaluationRelationalRepositoryAdapter(createFakePrismaClient());

  const record = await adapter.loadEvaluationResultRecordBySignalCandidateAndWindow(
    "candidate-001",
    "window-24h"
  );

  assert.equal(record?.identity.entityId, "result-001");
  assert.equal(record?.evaluationStatus, "completed");
});

test("prisma adapter maps foreign-key failures on signal candidate writes to invalid_reference", async () => {
  const client = createFakePrismaClient();
  client.signalCandidateRecord.create = async () => {
    throw { code: "P2003" };
  };
  const adapter = new PrismaSignalEvaluationRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertSignalCandidateRecord({
        record: buildSignalCandidateRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "invalid_reference" &&
      error.entityType === "signal_candidate" &&
      error.referenceEntityId === "setup-001"
  );
});

test("prisma adapter maps unique conflicts on evaluation-result writes to already_exists", async () => {
  const client = createFakePrismaClient();
  client.evaluationResultRecord.create = async () => {
    throw { code: "P2002" };
  };
  const adapter = new PrismaSignalEvaluationRelationalRepositoryAdapter(client);

  await assert.rejects(
    async () =>
      adapter.insertEvaluationResultRecord({
        record: buildEvaluationResultRecord(1),
        expectedVersion: null
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "already_exists" &&
      error.entityType === "evaluation_result"
  );
});

test("prisma adapter maps stale evaluation-result updates to version_mismatch", async () => {
  const adapter = new PrismaSignalEvaluationRelationalRepositoryAdapter(createFakePrismaClient());

  await assert.rejects(
    async () =>
      adapter.updateEvaluationResultRecord({
        record: buildEvaluationResultRecord(2),
        expectedVersion: 99
      }),
    (error: unknown) =>
      error instanceof RepositoryError &&
      error.code === "version_mismatch" &&
      error.entityType === "evaluation_result" &&
      error.expectedVersion === 99 &&
      error.actualVersion === 1
  );
});
