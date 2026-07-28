import { Prisma } from "../generated/prisma/client.js";
import type { ExecutionAttemptAuditDurableRecord } from "../storage/execution-attempt-audit-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  ExecutionAttemptAuditRecordWriteRequest,
  ExecutionAttemptAuditRelationalRepositoryAdapter
} from "./execution-attempt-audit-relational-repository-adapter.js";

type PrismaExecutionAttemptAuditRecordModel = Prisma.ExecutionAttemptAuditRecordGetPayload<object>;

type PrismaExecutionAttemptAuditRecordDelegate = {
  create(args: { data: Prisma.ExecutionAttemptAuditRecordUncheckedCreateInput }): Promise<PrismaExecutionAttemptAuditRecordModel>;
  findMany(args: {
    where: {
      reviewDecisionRoutingResultId?: string;
      executionAttemptAuditStatus?: { in: ExecutionAttemptAuditDurableRecord["executionAttemptAuditStatus"][] };
    };
    orderBy: { executionAttemptAuditId: "asc" };
  }): Promise<PrismaExecutionAttemptAuditRecordModel[]>;
  findUnique(args: { where: { executionAttemptAuditId: string } }): Promise<PrismaExecutionAttemptAuditRecordModel | null>;
  updateMany(args: {
    where: { executionAttemptAuditId: string; version?: number };
    data: Prisma.ExecutionAttemptAuditRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

export type ExecutionAttemptAuditRelationalPrismaClient = {
  executionAttemptAuditRecord: PrismaExecutionAttemptAuditRecordDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference" | "list_by_status" | "update";
  entityId?: string;
  expectedVersion?: number | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P2024", "P2034", "P2037"]);

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string";

const toTimestampUtc = (value: Date | null): string | null => value?.toISOString() ?? null;

const hydrateRecord = (row: PrismaExecutionAttemptAuditRecordModel): ExecutionAttemptAuditDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "execution_attempt_audit",
    entityId: row.executionAttemptAuditId,
    version: row.version,
    relatedEntityIds: [
      row.routedActionExecutionEnvelopeId,
      row.reviewDecisionRoutingResultId,
      row.researchReviewDecisionId
    ].filter((value): value is string => Boolean(value))
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: {
    originRunId: row.originRunId,
    originTransitionId: row.originTransitionId,
    createdBySource: row.createdBySource,
    lastUpdatedBySource: row.lastUpdatedBySource,
    traceId: row.traceId,
    sourceObservedAtUtc: toTimestampUtc(row.sourceObservedAtUtc),
    ...(row.metadataNotes ? { notes: row.metadataNotes } : {})
  },
  executionAttemptAuditStatus: row.executionAttemptAuditStatus,
  routedActionExecutionEnvelopeId: row.routedActionExecutionEnvelopeId,
  reviewDecisionRoutingResultId: row.reviewDecisionRoutingResultId,
  researchReviewDecisionId: row.researchReviewDecisionId,
  actionTarget: row.actionTarget,
  downstreamCommandType: row.downstreamCommandType,
  attemptedBy: row.attemptedBy,
  attemptedAtUtc: row.attemptedAtUtc.toISOString(),
  completedAtUtc: toTimestampUtc(row.completedAtUtc),
  outcomeCode: row.outcomeCode,
  outcomeSummary: row.outcomeSummary,
  warningCodes: [...(row.warningCodes as string[])]
});

const buildWriteData = (record: ExecutionAttemptAuditDurableRecord): Prisma.ExecutionAttemptAuditRecordUncheckedCreateInput => ({
  executionAttemptAuditId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  executionAttemptAuditStatus: record.executionAttemptAuditStatus,
  routedActionExecutionEnvelopeId: record.routedActionExecutionEnvelopeId,
  reviewDecisionRoutingResultId: record.reviewDecisionRoutingResultId,
  researchReviewDecisionId: record.researchReviewDecisionId,
  actionTarget: record.actionTarget,
  downstreamCommandType: record.downstreamCommandType,
  attemptedBy: record.attemptedBy,
  attemptedAtUtc: new Date(record.attemptedAtUtc),
  completedAtUtc: record.completedAtUtc ? new Date(record.completedAtUtc) : null,
  outcomeCode: record.outcomeCode,
  outcomeSummary: record.outcomeSummary,
  warningCodes: [...record.warningCodes] as Prisma.InputJsonValue,
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

const mapError = (error: unknown, context: ErrorContext): RepositoryError => {
  if (error instanceof RepositoryError) return error;
  if (isPrismaErrorWithCode(error) && error.code === "P2002") {
    return createAlreadyExistsRepositoryError({ entityType: "execution_attempt_audit", entityId: context.entityId ?? "unknown", operation: context.operation });
  }
  const code = isPrismaErrorWithCode(error) && TRANSIENT_PRISMA_ERROR_CODES.has(error.code) ? "transient_failure" : "unknown_failure";
  return new RepositoryError(`${code} persistence failure for execution_attempt_audit`, {
    code,
    operation: context.operation,
    entityType: "execution_attempt_audit",
    entityId: context.entityId ?? null,
    expectedVersion: context.expectedVersion ?? null,
    retryDisposition: "retryable"
  });
};

export class PrismaExecutionAttemptAuditRelationalRepositoryAdapter implements ExecutionAttemptAuditRelationalRepositoryAdapter {
  constructor(private readonly prisma: ExecutionAttemptAuditRelationalPrismaClient) {}

  async loadExecutionAttemptAuditRecord(attemptId: string): Promise<ExecutionAttemptAuditDurableRecord | null> {
    try {
      const row = await this.prisma.executionAttemptAuditRecord.findUnique({ where: { executionAttemptAuditId: attemptId } });
      return row ? hydrateRecord(row) : null;
    } catch (error) {
      throw mapError(error, { operation: "get_by_id", entityId: attemptId });
    }
  }

  async listExecutionAttemptAuditRecordsByRoutingResultId(routingResultId: string): Promise<ExecutionAttemptAuditDurableRecord[]> {
    try {
      const rows = await this.prisma.executionAttemptAuditRecord.findMany({ where: { reviewDecisionRoutingResultId: routingResultId }, orderBy: { executionAttemptAuditId: "asc" } });
      return rows.map(hydrateRecord);
    } catch (error) {
      throw mapError(error, { operation: "list_by_reference", entityId: routingResultId });
    }
  }

  async listExecutionAttemptAuditRecordsByStatus(statuses: ExecutionAttemptAuditDurableRecord["executionAttemptAuditStatus"][]): Promise<ExecutionAttemptAuditDurableRecord[]> {
    try {
      const rows = await this.prisma.executionAttemptAuditRecord.findMany({ where: { executionAttemptAuditStatus: { in: statuses } }, orderBy: { executionAttemptAuditId: "asc" } });
      return rows.map(hydrateRecord);
    } catch (error) {
      throw mapError(error, { operation: "list_by_status" });
    }
  }

  async insertExecutionAttemptAuditRecord(request: ExecutionAttemptAuditRecordWriteRequest): Promise<ExecutionAttemptAuditDurableRecord> {
    try {
      const row = await this.prisma.executionAttemptAuditRecord.create({ data: buildWriteData(request.record) });
      return hydrateRecord(row);
    } catch (error) {
      throw mapError(error, { operation: "create", entityId: request.record.identity.entityId });
    }
  }

  async updateExecutionAttemptAuditRecord(request: ExecutionAttemptAuditRecordWriteRequest): Promise<ExecutionAttemptAuditDurableRecord> {
    const attemptId = request.record.identity.entityId;
    try {
      const result = await this.prisma.executionAttemptAuditRecord.updateMany({
        where: { executionAttemptAuditId: attemptId, ...(request.expectedVersion !== null && request.expectedVersion !== undefined ? { version: request.expectedVersion } : {}) },
        data: buildWriteData(request.record)
      });
      const row = await this.prisma.executionAttemptAuditRecord.findUnique({ where: { executionAttemptAuditId: attemptId } });
      if (!row) throw createNotFoundRepositoryError({ entityType: "execution_attempt_audit", entityId: attemptId, operation: "update" });
      if (result.count === 0 && request.expectedVersion !== null && request.expectedVersion !== undefined) {
        throw createVersionMismatchRepositoryError({ entityType: "execution_attempt_audit", entityId: attemptId, operation: "update", expectedVersion: request.expectedVersion, actualVersion: row.version });
      }
      if (result.count === 0) throw new Error("unexpected update miss");
      return hydrateRecord(row);
    } catch (error) {
      throw mapError(error, { operation: "update", entityId: attemptId, expectedVersion: request.expectedVersion });
    }
  }
}
