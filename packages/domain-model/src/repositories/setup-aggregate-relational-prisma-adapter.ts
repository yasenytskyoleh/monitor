import { Prisma } from "../generated/prisma/client.js";
import {
  rehydrateSetupAggregateScope,
  type SetupAggregateResultDurableRecord
} from "../storage/index.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  SetupAggregateRelationalRepositoryAdapter,
  SetupAggregateResultRecordWriteRequest
} from "./setup-aggregate-relational-repository-adapter.js";

type PrismaSetupAggregateResultRecordModel = Prisma.SetupAggregateResultRecordGetPayload<object>;

type PrismaSetupAggregateResultDelegate = {
  create(args: {
    data: Prisma.SetupAggregateResultRecordUncheckedCreateInput;
  }): Promise<PrismaSetupAggregateResultRecordModel>;
  findFirst(args: {
    where: {
      setupDefinitionId: string;
      scopeKey: string;
    };
  }): Promise<PrismaSetupAggregateResultRecordModel | null>;
  findMany(args: {
    where:
      | {
          setupDefinitionId: string;
        }
      | {
          aggregateStatus: {
            in: SetupAggregateResultDurableRecord["aggregateStatus"][];
          };
        };
    orderBy: {
      setupAggregateResultId: "asc" | "desc";
    };
  }): Promise<PrismaSetupAggregateResultRecordModel[]>;
  findUnique(args: {
    where: {
      setupAggregateResultId: string;
    };
  }): Promise<PrismaSetupAggregateResultRecordModel | null>;
  updateMany(args: {
    where: {
      setupAggregateResultId: string;
      version?: number;
    };
    data: Prisma.SetupAggregateResultRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

type PrismaSetupDefinitionReferenceDelegate = {
  findUnique(args: {
    where: {
      setupDefinitionId: string;
    };
  }): Promise<{ setupDefinitionId: string } | null>;
};

type PrismaResearchHypothesisReferenceDelegate = {
  findUnique(args: {
    where: {
      researchHypothesisId: string;
    };
  }): Promise<{ researchHypothesisId: string } | null>;
};

export type SetupAggregateRelationalPrismaClient = {
  setupAggregateResultRecord: PrismaSetupAggregateResultDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
  researchHypothesisRecord: PrismaResearchHypothesisReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "get_by_reference" | "list_by_reference" | "list_by_status" | "update";
  entityType: "setup_aggregate_result";
  entityId?: string;
  expectedVersion?: number | null;
};

type ReferenceContext = {
  entityId: string;
  operation: "create" | "update";
  setupDefinitionId: string;
  researchHypothesisId: string | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P2024", "P2034", "P2037"]);

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const isForeignKeyConstraintError = (error: unknown): boolean =>
  isPrismaErrorWithCode(error) && error.code === "P2003";

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
  createdBySource: SetupAggregateResultDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SetupAggregateResultDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): SetupAggregateResultDurableRecord["metadata"] => ({
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

const dedupeRelatedEntityIds = (values: Array<string | null | undefined>): string[] => {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value) {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
};

const hydrateSetupAggregateResultRecord = (
  row: PrismaSetupAggregateResultRecordModel
): SetupAggregateResultDurableRecord => {
  const aggregationScope = rehydrateSetupAggregateScope(row.setupDefinitionId, {
    scopeKey: row.scopeKey,
    evaluationWindowId: row.scopeEvaluationWindowId,
    symbolScopeKind: row.scopeSymbolScopeKind,
    symbolIds: [...row.scopeSymbolIds],
    timeRangeStartAtUtc: row.scopeTimeRangeStartAtUtc.toISOString(),
    timeRangeEndAtUtc: row.scopeTimeRangeEndAtUtc.toISOString(),
    researchRunId: row.scopeResearchRunId,
    hypothesisId: row.scopeHypothesisId
  });

  return {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "setup_aggregate_result",
      entityId: row.setupAggregateResultId,
      version: row.version,
      relatedEntityIds: dedupeRelatedEntityIds([
        row.setupDefinitionId,
        row.researchHypothesisId,
        row.scopeEvaluationWindowId,
        ...row.scopeSymbolIds,
        row.scopeResearchRunId,
        row.scopeHypothesisId
      ])
    },
    lifecycleStatus: row.lifecycleStatus,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
    archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
    metadata: buildMetadata(row),
    aggregateStatus: row.aggregateStatus,
    setupDefinitionId: row.setupDefinitionId,
    researchHypothesisId: row.researchHypothesisId,
    aggregationScope,
    scopeKey: row.scopeKey,
    totalCandidates: row.totalCandidates,
    completedEvaluations: row.completedEvaluations,
    invalidatedEvaluations: row.invalidatedEvaluations,
    averagePercentageMove: row.averagePercentageMove,
    averageAbsoluteMove: row.averageAbsoluteMove,
    averageFinalOutcome: row.averageFinalOutcome,
    averageMaxFavorableExcursion: row.averageMaxFavorableExcursion,
    averageMaxAdverseExcursion: row.averageMaxAdverseExcursion,
    positiveOutcomeCount: row.positiveOutcomeCount,
    computedAtUtc: toTimestampUtc(row.computedAtUtc),
    notes: row.notes
  };
};

const buildSetupAggregateResultCreateData = (
  record: SetupAggregateResultDurableRecord
): Prisma.SetupAggregateResultRecordUncheckedCreateInput => ({
  setupAggregateResultId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  aggregateStatus: record.aggregateStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  scopeKey: record.scopeKey,
  scopeEvaluationWindowId: record.aggregationScope.evaluationWindowId,
  scopeSymbolScopeKind: record.aggregationScope.symbolScope.kind,
  scopeSymbolIds: record.aggregationScope.symbolScope.symbolIds,
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
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const buildSetupAggregateResultUpdateData = (
  record: SetupAggregateResultDurableRecord
): Prisma.SetupAggregateResultRecordUncheckedUpdateManyInput => ({
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  aggregateStatus: record.aggregateStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  scopeKey: record.scopeKey,
  scopeEvaluationWindowId: record.aggregationScope.evaluationWindowId,
  scopeSymbolScopeKind: record.aggregationScope.symbolScope.kind,
  scopeSymbolIds: { set: record.aggregationScope.symbolScope.symbolIds },
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
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const resolveInvalidReferenceRepositoryError = async (
  prisma: SetupAggregateRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
      where: { setupDefinitionId: context.setupDefinitionId }
    });
    if (!setupDefinition) {
      return createInvalidReferenceRepositoryError({
        entityType: "setup_aggregate_result",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: context.setupDefinitionId
      });
    }

    if (context.researchHypothesisId) {
      const hypothesis = await prisma.researchHypothesisRecord.findUnique({
        where: { researchHypothesisId: context.researchHypothesisId }
      });
      if (!hypothesis) {
        return createInvalidReferenceRepositoryError({
          entityType: "setup_aggregate_result",
          entityId: context.entityId,
          operation: context.operation,
          referenceEntityType: "research_hypothesis",
          referenceEntityId: context.researchHypothesisId
        });
      }
    }
  } catch {
    // Fall through to a deterministic best-effort mapping based on the write context.
  }

  return createInvalidReferenceRepositoryError({
    entityType: "setup_aggregate_result",
    entityId: context.entityId,
    operation: context.operation,
    referenceEntityType: context.researchHypothesisId ? "research_hypothesis" : "setup_definition",
    referenceEntityId: context.researchHypothesisId ?? context.setupDefinitionId
  });
};

export class PrismaSetupAggregateRelationalRepositoryAdapter
  implements SetupAggregateRelationalRepositoryAdapter
{
  constructor(private readonly prisma: SetupAggregateRelationalPrismaClient) {}

  async loadSetupAggregateResultRecord(
    setupAggregateResultId: string
  ): Promise<SetupAggregateResultDurableRecord | null> {
    try {
      const row = await this.prisma.setupAggregateResultRecord.findUnique({
        where: { setupAggregateResultId }
      });
      return row ? hydrateSetupAggregateResultRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "setup_aggregate_result",
        entityId: setupAggregateResultId
      });
    }
  }

  async loadSetupAggregateResultRecordBySetupDefinitionAndScope(
    setupDefinitionId: string,
    scopeKey: string
  ): Promise<SetupAggregateResultDurableRecord | null> {
    try {
      const row = await this.prisma.setupAggregateResultRecord.findFirst({
        where: {
          setupDefinitionId,
          scopeKey
        }
      });
      return row ? hydrateSetupAggregateResultRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_reference",
        entityType: "setup_aggregate_result",
        entityId: setupDefinitionId
      });
    }
  }

  async listSetupAggregateResultRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupAggregateResultDurableRecord[]> {
    try {
      const rows = await this.prisma.setupAggregateResultRecord.findMany({
        where: { setupDefinitionId },
        orderBy: { setupAggregateResultId: "asc" }
      });
      return rows.map((row) => hydrateSetupAggregateResultRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_aggregate_result",
        entityId: setupDefinitionId
      });
    }
  }

  async listSetupAggregateResultRecordsByStatus(
    statuses: SetupAggregateResultDurableRecord["aggregateStatus"][]
  ): Promise<SetupAggregateResultDurableRecord[]> {
    try {
      const rows = await this.prisma.setupAggregateResultRecord.findMany({
        where: {
          aggregateStatus: {
            in: statuses
          }
        },
        orderBy: { setupAggregateResultId: "asc" }
      });
      return rows.map((row) => hydrateSetupAggregateResultRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_status",
        entityType: "setup_aggregate_result"
      });
    }
  }

  async insertSetupAggregateResultRecord(
    request: SetupAggregateResultRecordWriteRequest
  ): Promise<SetupAggregateResultDurableRecord> {
    try {
      const row = await this.prisma.setupAggregateResultRecord.create({
        data: buildSetupAggregateResultCreateData(request.record)
      });
      return hydrateSetupAggregateResultRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, {
          entityId: request.record.identity.entityId,
          operation: "create",
          setupDefinitionId: request.record.setupDefinitionId,
          researchHypothesisId: request.record.researchHypothesisId
        });
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_aggregate_result",
        entityId: request.record.identity.entityId
      });
    }
  }

  async updateSetupAggregateResultRecord(
    request: SetupAggregateResultRecordWriteRequest
  ): Promise<SetupAggregateResultDurableRecord> {
    const setupAggregateResultId = request.record.identity.entityId;

    try {
      const updated = await this.prisma.setupAggregateResultRecord.updateMany({
        where: {
          setupAggregateResultId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildSetupAggregateResultUpdateData(request.record)
      });

      if (updated.count === 0) {
        const current = await this.prisma.setupAggregateResultRecord.findUnique({
          where: { setupAggregateResultId }
        });
        if (!current) {
          throw createNotFoundRepositoryError({
            entityType: "setup_aggregate_result",
            entityId: setupAggregateResultId,
            operation: "update"
          });
        }

        if (request.expectedVersion !== null) {
          throw createVersionMismatchRepositoryError({
            entityType: "setup_aggregate_result",
            entityId: setupAggregateResultId,
            operation: "update",
            expectedVersion: request.expectedVersion,
            actualVersion: current.version
          });
        }

        throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
          operation: "update",
          entityType: "setup_aggregate_result",
          entityId: setupAggregateResultId
        });
      }

      const row = await this.prisma.setupAggregateResultRecord.findUnique({
        where: { setupAggregateResultId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "setup_aggregate_result",
          entityId: setupAggregateResultId,
          operation: "update"
        });
      }

      return hydrateSetupAggregateResultRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, {
          entityId: setupAggregateResultId,
          operation: "update",
          setupDefinitionId: request.record.setupDefinitionId,
          researchHypothesisId: request.record.researchHypothesisId
        });
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "setup_aggregate_result",
        entityId: setupAggregateResultId,
        expectedVersion: request.expectedVersion
      });
    }
  }
}
