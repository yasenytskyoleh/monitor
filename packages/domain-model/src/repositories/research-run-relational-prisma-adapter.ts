import { Prisma } from "../generated/prisma/client.js";
import type { ResearchRunDurableRecord } from "../storage/research-run-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  ResearchRunRecordWriteRequest,
  ResearchRunRelationalRepositoryAdapter
} from "./research-run-relational-repository-adapter.js";

type PrismaResearchRunRecordModel = Prisma.ResearchRunRecordGetPayload<object>;

type PrismaResearchRunRecordDelegate = {
  create(args: {
    data: Prisma.ResearchRunRecordUncheckedCreateInput;
  }): Promise<PrismaResearchRunRecordModel>;
  findMany(args: {
    where: {
      hypothesisId?: string;
      researchRunStatus?: {
        in: ResearchRunDurableRecord["researchRunStatus"][];
      };
    };
    orderBy: { researchRunId: "asc" };
  }): Promise<PrismaResearchRunRecordModel[]>;
  findUnique(args: {
    where: { researchRunId: string };
  }): Promise<PrismaResearchRunRecordModel | null>;
  updateMany(args: {
    where: { researchRunId: string; version?: number };
    data: Prisma.ResearchRunRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

export type ResearchRunRelationalPrismaClient = {
  researchRunRecord: PrismaResearchRunRecordDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference" | "list_by_status" | "update";
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

const toTimestampUtc = (value: Date | null): string | null => value?.toISOString() ?? null;

const buildMetadata = (
  row: PrismaResearchRunRecordModel
): ResearchRunDurableRecord["metadata"] => ({
  originRunId: row.originRunId,
  originTransitionId: row.originTransitionId,
  createdBySource: row.createdBySource,
  lastUpdatedBySource: row.lastUpdatedBySource,
  traceId: row.traceId,
  sourceObservedAtUtc: toTimestampUtc(row.sourceObservedAtUtc),
  ...(row.metadataNotes ? { notes: row.metadataNotes } : {})
});

const hydrateResearchRunRecord = (
  row: PrismaResearchRunRecordModel
): ResearchRunDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_run",
    entityId: row.researchRunId,
    version: row.version,
    relatedEntityIds: [
      row.hypothesisId,
      row.setupId,
      ...row.candidateIds,
      ...row.evaluationResultIds
    ]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  researchRunStatus: row.researchRunStatus,
  hypothesisId: row.hypothesisId,
  setupId: row.setupId,
  candidateIds: [...row.candidateIds],
  evaluationWindowIds: [...row.evaluationWindowIds],
  evaluationResultIds: [...row.evaluationResultIds],
  startedAtUtc: row.startedAtUtc.toISOString(),
  completedAtUtc: toTimestampUtc(row.completedAtUtc),
  summary: row.summary
});

const buildWriteData = (
  record: ResearchRunDurableRecord
): Prisma.ResearchRunRecordUncheckedCreateInput => ({
  researchRunId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  researchRunStatus: record.researchRunStatus,
  hypothesisId: record.hypothesisId,
  setupId: record.setupId,
  candidateIds: [...record.candidateIds],
  evaluationWindowIds: [...record.evaluationWindowIds],
  evaluationResultIds: [...record.evaluationResultIds],
  startedAtUtc: new Date(record.startedAtUtc),
  completedAtUtc: record.completedAtUtc ? new Date(record.completedAtUtc) : null,
  summary: record.summary,
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
      entityType: "research_run",
      entityId: context.entityId ?? "unknown",
      operation: context.operation
    });
  }

  const code =
    isPrismaErrorWithCode(error) && TRANSIENT_PRISMA_ERROR_CODES.has(error.code)
      ? "transient_failure"
      : "unknown_failure";

  return new RepositoryError(
    `${code} persistence failure for research_run${context.entityId ? `: ${context.entityId}` : ""}`,
    {
      code,
      operation: context.operation,
      entityType: "research_run",
      entityId: context.entityId ?? null,
      expectedVersion: context.expectedVersion ?? null,
      retryDisposition: "retryable"
    }
  );
};

export class PrismaResearchRunRelationalRepositoryAdapter
  implements ResearchRunRelationalRepositoryAdapter
{
  constructor(private readonly prisma: ResearchRunRelationalPrismaClient) {}

  async loadResearchRunRecord(
    runId: string
  ): Promise<ResearchRunDurableRecord | null> {
    try {
      const row = await this.prisma.researchRunRecord.findUnique({
        where: { researchRunId: runId }
      });
      return row ? hydrateResearchRunRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityId: runId
      });
    }
  }

  async listResearchRunRecordsByHypothesisId(
    hypothesisId: string
  ): Promise<ResearchRunDurableRecord[]> {
    try {
      const rows = await this.prisma.researchRunRecord.findMany({
        where: { hypothesisId },
        orderBy: { researchRunId: "asc" }
      });
      return rows.map((row) => hydrateResearchRunRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityId: hypothesisId
      });
    }
  }

  async listResearchRunRecordsByStatus(
    statuses: ResearchRunDurableRecord["researchRunStatus"][]
  ): Promise<ResearchRunDurableRecord[]> {
    try {
      const rows = await this.prisma.researchRunRecord.findMany({
        where: { researchRunStatus: { in: statuses } },
        orderBy: { researchRunId: "asc" }
      });
      return rows.map((row) => hydrateResearchRunRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, { operation: "list_by_status" });
    }
  }

  async insertResearchRunRecord(
    request: ResearchRunRecordWriteRequest
  ): Promise<ResearchRunDurableRecord> {
    try {
      const row = await this.prisma.researchRunRecord.create({
        data: buildWriteData(request.record)
      });
      return hydrateResearchRunRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityId: request.record.identity.entityId
      });
    }
  }

  async updateResearchRunRecord(
    request: ResearchRunRecordWriteRequest
  ): Promise<ResearchRunDurableRecord> {
    const runId = request.record.identity.entityId;

    try {
      const result = await this.prisma.researchRunRecord.updateMany({
        where: {
          researchRunId: runId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildWriteData(request.record)
      });
      const row = await this.prisma.researchRunRecord.findUnique({
        where: { researchRunId: runId }
      });

      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "research_run",
          entityId: runId,
          operation: "update"
        });
      }

      if (result.count === 0 && request.expectedVersion !== null) {
        throw createVersionMismatchRepositoryError({
          entityType: "research_run",
          entityId: runId,
          operation: "update",
          expectedVersion: request.expectedVersion,
          actualVersion: row.version
        });
      }

      if (result.count === 0) {
        throw new Error("unexpected update miss");
      }

      return hydrateResearchRunRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityId: runId,
        expectedVersion: request.expectedVersion
      });
    }
  }
}
