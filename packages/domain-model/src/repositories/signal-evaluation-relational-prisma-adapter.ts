import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import type {
  EvaluationResultDurableRecord,
  SignalCandidateDurableRecord
} from "../storage/signal-evaluation-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  EvaluationResultRecordWriteRequest,
  SignalCandidateRecordWriteRequest,
  SignalEvaluationRelationalRepositoryAdapter
} from "./signal-evaluation-relational-repository-adapter.js";

type PrismaSignalCandidateRecordModel = Prisma.SignalCandidateRecordGetPayload<object>;
type PrismaEvaluationResultRecordModel = Prisma.EvaluationResultRecordGetPayload<object>;

type PrismaSignalCandidateDelegate = {
  create(args: {
    data: Prisma.SignalCandidateRecordUncheckedCreateInput;
  }): Promise<PrismaSignalCandidateRecordModel>;
  findMany(args: {
    where:
      | {
          setupDefinitionId: string;
        }
      | {
          monitoredSymbolId: string;
        }
      | {
          candidateStatus: {
            in: SignalCandidateDurableRecord["candidateStatus"][];
          };
        };
    orderBy: {
      signalCandidateId: "asc" | "desc";
    };
  }): Promise<PrismaSignalCandidateRecordModel[]>;
  findUnique(args: {
    where: {
      signalCandidateId: string;
    };
  }): Promise<PrismaSignalCandidateRecordModel | null>;
  updateMany(args: {
    where: {
      signalCandidateId: string;
      version?: number;
    };
    data: Prisma.SignalCandidateRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

type PrismaEvaluationResultDelegate = {
  create(args: {
    data: Prisma.EvaluationResultRecordUncheckedCreateInput;
  }): Promise<PrismaEvaluationResultRecordModel>;
  findFirst(args: {
    where: {
      signalCandidateId: string;
      evaluationWindowId: string;
    };
  }): Promise<PrismaEvaluationResultRecordModel | null>;
  findMany(args: {
    where:
      | {
          signalCandidateId: string;
        }
      | {
          evaluationWindowId: string;
        }
      | {
          evaluationStatus: {
            in: EvaluationResultDurableRecord["evaluationStatus"][];
          };
        };
    orderBy: {
      evaluationResultId: "asc" | "desc";
    };
  }): Promise<PrismaEvaluationResultRecordModel[]>;
  findUnique(args: {
    where: {
      evaluationResultId: string;
    };
  }): Promise<PrismaEvaluationResultRecordModel | null>;
  updateMany(args: {
    where: {
      evaluationResultId: string;
      version?: number;
    };
    data: Prisma.EvaluationResultRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

export type SignalEvaluationRelationalPrismaClient = {
  signalCandidateRecord: PrismaSignalCandidateDelegate;
  evaluationResultRecord: PrismaEvaluationResultDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "get_by_reference" | "list_by_reference" | "list_by_status" | "update";
  entityType: "signal_candidate" | "evaluation_result";
  entityId?: string;
  expectedVersion?: number | null;
  referenceEntityType?: "setup_definition" | "signal_candidate" | null;
  referenceEntityId?: string | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P2024", "P2034", "P2037"]);

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const mapPrismaErrorToRepositoryError = (error: unknown, context: ErrorContext): RepositoryError => {
  if (error instanceof RepositoryError) {
    return error;
  }

  if (isPrismaErrorWithCode(error)) {
    if (error.code === "P2002") {
      return createAlreadyExistsRepositoryError({
        entityType: context.entityType,
        entityId: context.entityId ?? "unknown",
        operation: context.operation === "get_by_reference" ? "create" : context.operation
      });
    }

    if (error.code === "P2003") {
      return new RepositoryError(
        `invalid ${context.referenceEntityType ?? "unknown"} reference for ${context.entityType}: ${context.referenceEntityId ?? "unknown"}`,
        {
          code: "invalid_reference",
          operation: context.operation,
          entityType: context.entityType,
          entityId: context.entityId ?? null,
          referenceEntityType: context.referenceEntityType ?? null,
          referenceEntityId: context.referenceEntityId ?? null,
          retryDisposition: "do_not_retry"
        }
      );
    }

    if (TRANSIENT_PRISMA_ERROR_CODES.has(error.code)) {
      return new RepositoryError(
        `transient persistence failure for ${context.entityType}${context.entityId ? `: ${context.entityId}` : ""}`,
        {
          code: "transient_failure",
          operation: context.operation,
          entityType: context.entityType,
          entityId: context.entityId ?? null,
          expectedVersion: context.expectedVersion ?? null,
          retryDisposition: "retryable"
        }
      );
    }
  }

  return new RepositoryError(
    `unknown persistence failure for ${context.entityType}${context.entityId ? `: ${context.entityId}` : ""}`,
    {
      code: "unknown_failure",
      operation: context.operation,
      entityType: context.entityType,
      entityId: context.entityId ?? null,
      expectedVersion: context.expectedVersion ?? null,
      retryDisposition: "retryable"
    }
  );
};

const buildMetadata = (row: {
  originRunId: string | null;
  originTransitionId: string | null;
  createdBySource: SignalCandidateDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SignalCandidateDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): SignalCandidateDurableRecord["metadata"] => ({
  originRunId: row.originRunId,
  originTransitionId: row.originTransitionId,
  createdBySource: row.createdBySource,
  lastUpdatedBySource: row.lastUpdatedBySource,
  traceId: row.traceId,
  sourceObservedAtUtc:
    row.sourceObservedAtUtc instanceof Date
      ? row.sourceObservedAtUtc.toISOString()
      : row.sourceObservedAtUtc,
  ...(row.metadataNotes ? { notes: row.metadataNotes } : {})
});

const toTimestampUtc = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;

const hydrateSignalCandidateRecord = (
  row: PrismaSignalCandidateRecordModel
): SignalCandidateDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "signal_candidate",
    entityId: row.signalCandidateId,
    version: row.version,
    relatedEntityIds: [
      row.setupDefinitionId,
      row.setupRevisionId,
      row.monitoredSymbolId,
      ...(row.detectionHitId ? [row.detectionHitId] : [])
    ]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  candidateStatus: row.candidateStatus,
  setupDefinitionId: row.setupDefinitionId,
  setupRevisionId: row.setupRevisionId,
  monitoredSymbolId: row.monitoredSymbolId,
  detectionHitId: row.detectionHitId,
  detectedAtUtc: row.detectedAtUtc.toISOString(),
  evidenceSummary: row.evidenceSummary,
  candidateOriginRunId: row.candidateOriginRunId
});

const hydrateEvaluationResultRecord = (
  row: PrismaEvaluationResultRecordModel
): EvaluationResultDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "evaluation_result",
    entityId: row.evaluationResultId,
    version: row.version,
    relatedEntityIds: [row.signalCandidateId, row.evaluationWindowId]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  evaluationStatus: row.evaluationStatus,
  signalCandidateId: row.signalCandidateId,
  evaluationWindowId: row.evaluationWindowId,
  referencePrice: row.referencePrice,
  finalPrice: row.finalPrice,
  highInWindow: row.highInWindow,
  lowInWindow: row.lowInWindow,
  absoluteMove: row.absoluteMove,
  percentageMove: row.percentageMove,
  maxFavorableExcursion: row.maxFavorableExcursion,
  maxAdverseExcursion: row.maxAdverseExcursion,
  evaluatedAtUtc: toTimestampUtc(row.evaluatedAtUtc),
  notes: row.notes
});

const buildSignalCandidateCreateData = (
  record: SignalCandidateDurableRecord
): Prisma.SignalCandidateRecordUncheckedCreateInput => ({
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
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const buildSignalCandidateUpdateData = (
  record: SignalCandidateDurableRecord
): Prisma.SignalCandidateRecordUncheckedUpdateManyInput => ({
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
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const buildEvaluationResultCreateData = (
  record: EvaluationResultDurableRecord
): Prisma.EvaluationResultRecordUncheckedCreateInput => ({
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
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const buildEvaluationResultUpdateData = (
  record: EvaluationResultDurableRecord
): Prisma.EvaluationResultRecordUncheckedUpdateManyInput => ({
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
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

export class PrismaSignalEvaluationRelationalRepositoryAdapter
  implements SignalEvaluationRelationalRepositoryAdapter
{
  constructor(private readonly prisma: SignalEvaluationRelationalPrismaClient) {}

  async loadSignalCandidateRecord(
    signalCandidateId: string
  ): Promise<SignalCandidateDurableRecord | null> {
    try {
      const row = await this.prisma.signalCandidateRecord.findUnique({
        where: { signalCandidateId }
      });
      return row ? hydrateSignalCandidateRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "signal_candidate",
        entityId: signalCandidateId
      });
    }
  }

  async listSignalCandidateRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SignalCandidateDurableRecord[]> {
    try {
      const rows = await this.prisma.signalCandidateRecord.findMany({
        where: { setupDefinitionId },
        orderBy: { signalCandidateId: "asc" }
      });
      return rows.map((row) => hydrateSignalCandidateRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "signal_candidate",
        referenceEntityType: "setup_definition",
        referenceEntityId: setupDefinitionId
      });
    }
  }

  async listSignalCandidateRecordsByMonitoredSymbolId(
    monitoredSymbolId: string
  ): Promise<SignalCandidateDurableRecord[]> {
    try {
      const rows = await this.prisma.signalCandidateRecord.findMany({
        where: { monitoredSymbolId },
        orderBy: { signalCandidateId: "asc" }
      });
      return rows.map((row) => hydrateSignalCandidateRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "signal_candidate",
        referenceEntityId: monitoredSymbolId
      });
    }
  }

  async listSignalCandidateRecordsByStatus(
    statuses: SignalCandidateDurableRecord["candidateStatus"][]
  ): Promise<SignalCandidateDurableRecord[]> {
    try {
      const rows = await this.prisma.signalCandidateRecord.findMany({
        where: {
          candidateStatus: {
            in: statuses
          }
        },
        orderBy: { signalCandidateId: "asc" }
      });
      return rows.map((row) => hydrateSignalCandidateRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_status",
        entityType: "signal_candidate"
      });
    }
  }

  async insertSignalCandidateRecord(
    request: SignalCandidateRecordWriteRequest
  ): Promise<SignalCandidateDurableRecord> {
    try {
      const row = await this.prisma.signalCandidateRecord.create({
        data: buildSignalCandidateCreateData(request.record)
      });
      return hydrateSignalCandidateRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "signal_candidate",
        entityId: request.record.identity.entityId,
        referenceEntityType: "setup_definition",
        referenceEntityId: request.record.setupDefinitionId
      });
    }
  }

  async updateSignalCandidateRecord(
    request: SignalCandidateRecordWriteRequest
  ): Promise<SignalCandidateDurableRecord> {
    const signalCandidateId = request.record.identity.entityId;

    try {
      const updated = await this.prisma.signalCandidateRecord.updateMany({
        where: {
          signalCandidateId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildSignalCandidateUpdateData(request.record)
      });

      if (updated.count === 0) {
        const current = await this.prisma.signalCandidateRecord.findUnique({
          where: { signalCandidateId }
        });
        if (!current) {
          throw createNotFoundRepositoryError({
            entityType: "signal_candidate",
            entityId: signalCandidateId,
            operation: "update"
          });
        }

        if (request.expectedVersion !== null) {
          throw createVersionMismatchRepositoryError({
            entityType: "signal_candidate",
            entityId: signalCandidateId,
            operation: "update",
            expectedVersion: request.expectedVersion,
            actualVersion: current.version
          });
        }

        throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
          operation: "update",
          entityType: "signal_candidate",
          entityId: signalCandidateId
        });
      }

      const row = await this.prisma.signalCandidateRecord.findUnique({
        where: { signalCandidateId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "signal_candidate",
          entityId: signalCandidateId,
          operation: "update"
        });
      }

      return hydrateSignalCandidateRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "signal_candidate",
        entityId: signalCandidateId,
        expectedVersion: request.expectedVersion,
        referenceEntityType: "setup_definition",
        referenceEntityId: request.record.setupDefinitionId
      });
    }
  }

  async loadEvaluationResultRecord(
    evaluationResultId: string
  ): Promise<EvaluationResultDurableRecord | null> {
    try {
      const row = await this.prisma.evaluationResultRecord.findUnique({
        where: { evaluationResultId }
      });
      return row ? hydrateEvaluationResultRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "evaluation_result",
        entityId: evaluationResultId
      });
    }
  }

  async loadEvaluationResultRecordBySignalCandidateAndWindow(
    signalCandidateId: string,
    evaluationWindowId: string
  ): Promise<EvaluationResultDurableRecord | null> {
    try {
      const row = await this.prisma.evaluationResultRecord.findFirst({
        where: {
          signalCandidateId,
          evaluationWindowId
        }
      });
      return row ? hydrateEvaluationResultRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_reference",
        entityType: "evaluation_result",
        referenceEntityType: "signal_candidate",
        referenceEntityId: signalCandidateId
      });
    }
  }

  async listEvaluationResultRecordsBySignalCandidateId(
    signalCandidateId: string
  ): Promise<EvaluationResultDurableRecord[]> {
    try {
      const rows = await this.prisma.evaluationResultRecord.findMany({
        where: { signalCandidateId },
        orderBy: { evaluationResultId: "asc" }
      });
      return rows.map((row) => hydrateEvaluationResultRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "evaluation_result",
        referenceEntityType: "signal_candidate",
        referenceEntityId: signalCandidateId
      });
    }
  }

  async listEvaluationResultRecordsByEvaluationWindowId(
    evaluationWindowId: string
  ): Promise<EvaluationResultDurableRecord[]> {
    try {
      const rows = await this.prisma.evaluationResultRecord.findMany({
        where: { evaluationWindowId },
        orderBy: { evaluationResultId: "asc" }
      });
      return rows.map((row) => hydrateEvaluationResultRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "evaluation_result",
        referenceEntityId: evaluationWindowId
      });
    }
  }

  async listEvaluationResultRecordsByStatus(
    statuses: EvaluationResultDurableRecord["evaluationStatus"][]
  ): Promise<EvaluationResultDurableRecord[]> {
    try {
      const rows = await this.prisma.evaluationResultRecord.findMany({
        where: {
          evaluationStatus: {
            in: statuses
          }
        },
        orderBy: { evaluationResultId: "asc" }
      });
      return rows.map((row) => hydrateEvaluationResultRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_status",
        entityType: "evaluation_result"
      });
    }
  }

  async insertEvaluationResultRecord(
    request: EvaluationResultRecordWriteRequest
  ): Promise<EvaluationResultDurableRecord> {
    try {
      const row = await this.prisma.evaluationResultRecord.create({
        data: buildEvaluationResultCreateData(request.record)
      });
      return hydrateEvaluationResultRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "evaluation_result",
        entityId: request.record.identity.entityId,
        referenceEntityType: "signal_candidate",
        referenceEntityId: request.record.signalCandidateId
      });
    }
  }

  async updateEvaluationResultRecord(
    request: EvaluationResultRecordWriteRequest
  ): Promise<EvaluationResultDurableRecord> {
    const evaluationResultId = request.record.identity.entityId;

    try {
      const updated = await this.prisma.evaluationResultRecord.updateMany({
        where: {
          evaluationResultId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildEvaluationResultUpdateData(request.record)
      });

      if (updated.count === 0) {
        const current = await this.prisma.evaluationResultRecord.findUnique({
          where: { evaluationResultId }
        });
        if (!current) {
          throw createNotFoundRepositoryError({
            entityType: "evaluation_result",
            entityId: evaluationResultId,
            operation: "update"
          });
        }

        if (request.expectedVersion !== null) {
          throw createVersionMismatchRepositoryError({
            entityType: "evaluation_result",
            entityId: evaluationResultId,
            operation: "update",
            expectedVersion: request.expectedVersion,
            actualVersion: current.version
          });
        }

        throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
          operation: "update",
          entityType: "evaluation_result",
          entityId: evaluationResultId
        });
      }

      const row = await this.prisma.evaluationResultRecord.findUnique({
        where: { evaluationResultId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "evaluation_result",
          entityId: evaluationResultId,
          operation: "update"
        });
      }

      return hydrateEvaluationResultRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "evaluation_result",
        entityId: evaluationResultId,
        expectedVersion: request.expectedVersion,
        referenceEntityType: "signal_candidate",
        referenceEntityId: request.record.signalCandidateId
      });
    }
  }
}
