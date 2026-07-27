import { Prisma } from "../generated/prisma/client.js";
import type { JsonObject } from "../common.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  ResearchFeedbackDecisionRecordWriteRequest,
  ResearchFeedbackDecisionRelationalRepositoryAdapter
} from "./research-feedback-decision-relational-repository-adapter.js";

type PrismaResearchFeedbackDecisionRecordModel =
  Prisma.ResearchFeedbackDecisionRecordGetPayload<object>;

type PrismaResearchFeedbackDecisionDelegate = {
  create(args: {
    data: Prisma.ResearchFeedbackDecisionRecordUncheckedCreateInput;
  }): Promise<PrismaResearchFeedbackDecisionRecordModel>;
  findMany(args: {
    where:
      | {
          setupDefinitionId: string;
        }
      | {
          researchHypothesisId: string;
        };
    orderBy: {
      researchFeedbackDecisionId: "asc" | "desc";
    };
  }): Promise<PrismaResearchFeedbackDecisionRecordModel[]>;
  findUnique(args: {
    where: {
      researchFeedbackDecisionId: string;
    };
  }): Promise<PrismaResearchFeedbackDecisionRecordModel | null>;
  updateMany(args: {
    where: {
      researchFeedbackDecisionId: string;
      version?: number;
    };
    data: Prisma.ResearchFeedbackDecisionRecordUncheckedUpdateManyInput;
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

type PrismaSetupAggregateResultReferenceDelegate = {
  findUnique(args: {
    where: {
      setupAggregateResultId: string;
    };
  }): Promise<{ setupAggregateResultId: string } | null>;
};

export type ResearchFeedbackDecisionRelationalPrismaClient = {
  researchFeedbackDecisionRecord: PrismaResearchFeedbackDecisionDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
  researchHypothesisRecord: PrismaResearchHypothesisReferenceDelegate;
  setupAggregateResultRecord: PrismaSetupAggregateResultReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference" | "update";
  entityType: "research_feedback_decision";
  entityId?: string;
  expectedVersion?: number | null;
};

type ReferenceContext = {
  entityId: string;
  operation: "create" | "update";
  setupDefinitionId: string;
  researchHypothesisId: string;
  setupAggregateResultId: string | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P2024", "P2034", "P2037"]);

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const isForeignKeyConstraintError = (error: unknown): boolean =>
  isPrismaErrorWithCode(error) && error.code === "P2003";

const mapPrismaErrorToRepositoryError = (
  error: unknown,
  context: ErrorContext
): RepositoryError => {
  if (error instanceof RepositoryError) {
    return error;
  }

  if (isPrismaErrorWithCode(error)) {
    if (error.code === "P2002") {
      return createAlreadyExistsRepositoryError({
        entityType: context.entityType,
        entityId: context.entityId ?? "unknown",
        operation: context.operation
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
  createdBySource: ResearchFeedbackDecisionDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: ResearchFeedbackDecisionDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): ResearchFeedbackDecisionDurableRecord["metadata"] => ({
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

const toJsonObject = (value: Prisma.JsonValue | null): JsonObject | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return structuredClone(value as JsonObject);
};

const toPrismaReviewerMetadata = (
  value: JsonObject | null
):
  | Prisma.InputJsonValue
  | Prisma.NullableJsonNullValueInput
  | undefined => {
  if (value === null) {
    return Prisma.DbNull;
  }

  return structuredClone(value) as Prisma.InputJsonValue;
};

const hydrateResearchFeedbackDecisionRecord = (
  row: PrismaResearchFeedbackDecisionRecordModel
): ResearchFeedbackDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_feedback_decision",
    entityId: row.researchFeedbackDecisionId,
    version: row.version,
    relatedEntityIds: dedupeRelatedEntityIds([
      row.setupDefinitionId,
      row.researchHypothesisId,
      row.setupAggregateResultId
    ])
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  decisionStatus: row.decisionStatus,
  setupDefinitionId: row.setupDefinitionId,
  researchHypothesisId: row.researchHypothesisId,
  setupAggregateResultId: row.setupAggregateResultId,
  evidenceStatus: row.evidenceStatus,
  recommendedAction: row.recommendedAction,
  rationaleSummary: row.rationaleSummary,
  requiresManualReview: row.requiresManualReview,
  evidenceSummary: row.evidenceSummary,
  reviewerMetadata: toJsonObject(row.reviewerMetadata)
});

const buildResearchFeedbackDecisionCreateData = (
  record: ResearchFeedbackDecisionDurableRecord
): Prisma.ResearchFeedbackDecisionRecordUncheckedCreateInput => ({
  researchFeedbackDecisionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  decisionStatus: record.decisionStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  setupAggregateResultId: record.setupAggregateResultId,
  evidenceStatus: record.evidenceStatus,
  recommendedAction: record.recommendedAction,
  rationaleSummary: record.rationaleSummary,
  requiresManualReview: record.requiresManualReview,
  evidenceSummary: record.evidenceSummary,
  reviewerMetadata: toPrismaReviewerMetadata(record.reviewerMetadata),
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

const buildResearchFeedbackDecisionUpdateData = (
  record: ResearchFeedbackDecisionDurableRecord
): Prisma.ResearchFeedbackDecisionRecordUncheckedUpdateManyInput => ({
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  decisionStatus: record.decisionStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  setupAggregateResultId: record.setupAggregateResultId,
  evidenceStatus: record.evidenceStatus,
  recommendedAction: record.recommendedAction,
  rationaleSummary: record.rationaleSummary,
  requiresManualReview: record.requiresManualReview,
  evidenceSummary: record.evidenceSummary,
  reviewerMetadata: toPrismaReviewerMetadata(record.reviewerMetadata),
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

const resolveInvalidReferenceRepositoryError = async (
  prisma: ResearchFeedbackDecisionRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
      where: { setupDefinitionId: context.setupDefinitionId }
    });
    if (!setupDefinition) {
      return createInvalidReferenceRepositoryError({
        entityType: "research_feedback_decision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: context.setupDefinitionId
      });
    }

    const hypothesis = await prisma.researchHypothesisRecord.findUnique({
      where: { researchHypothesisId: context.researchHypothesisId }
    });
    if (!hypothesis) {
      return createInvalidReferenceRepositoryError({
        entityType: "research_feedback_decision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_hypothesis",
        referenceEntityId: context.researchHypothesisId
      });
    }

    if (context.setupAggregateResultId) {
      const aggregate = await prisma.setupAggregateResultRecord.findUnique({
        where: { setupAggregateResultId: context.setupAggregateResultId }
      });
      if (!aggregate) {
        return createInvalidReferenceRepositoryError({
          entityType: "research_feedback_decision",
          entityId: context.entityId,
          operation: context.operation,
          referenceEntityType: "setup_aggregate_result",
          referenceEntityId: context.setupAggregateResultId
        });
      }
    }
  } catch {
    // Fall through to a deterministic best-effort mapping based on the write context.
  }

  return createInvalidReferenceRepositoryError({
    entityType: "research_feedback_decision",
    entityId: context.entityId,
    operation: context.operation,
    referenceEntityType: context.setupAggregateResultId
      ? "setup_aggregate_result"
      : "research_hypothesis",
    referenceEntityId: context.setupAggregateResultId ?? context.researchHypothesisId
  });
};

export class PrismaResearchFeedbackDecisionRelationalRepositoryAdapter
  implements ResearchFeedbackDecisionRelationalRepositoryAdapter
{
  constructor(private readonly prisma: ResearchFeedbackDecisionRelationalPrismaClient) {}

  async loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord | null> {
    try {
      const row = await this.prisma.researchFeedbackDecisionRecord.findUnique({
        where: { researchFeedbackDecisionId }
      });
      return row ? hydrateResearchFeedbackDecisionRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "research_feedback_decision",
        entityId: researchFeedbackDecisionId
      });
    }
  }

  async listResearchFeedbackDecisionRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord[]> {
    try {
      const rows = await this.prisma.researchFeedbackDecisionRecord.findMany({
        where: { setupDefinitionId },
        orderBy: { researchFeedbackDecisionId: "asc" }
      });
      return rows.map((row) => hydrateResearchFeedbackDecisionRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "research_feedback_decision",
        entityId: setupDefinitionId
      });
    }
  }

  async listResearchFeedbackDecisionRecordsByResearchHypothesisId(
    researchHypothesisId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord[]> {
    try {
      const rows = await this.prisma.researchFeedbackDecisionRecord.findMany({
        where: { researchHypothesisId },
        orderBy: { researchFeedbackDecisionId: "asc" }
      });
      return rows.map((row) => hydrateResearchFeedbackDecisionRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "research_feedback_decision",
        entityId: researchHypothesisId
      });
    }
  }

  async insertResearchFeedbackDecisionRecord(
    request: ResearchFeedbackDecisionRecordWriteRequest
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    try {
      const row = await this.prisma.researchFeedbackDecisionRecord.create({
        data: buildResearchFeedbackDecisionCreateData(request.record)
      });
      return hydrateResearchFeedbackDecisionRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, {
          entityId: request.record.identity.entityId,
          operation: "create",
          setupDefinitionId: request.record.setupDefinitionId,
          researchHypothesisId: request.record.researchHypothesisId,
          setupAggregateResultId: request.record.setupAggregateResultId
        });
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "research_feedback_decision",
        entityId: request.record.identity.entityId
      });
    }
  }

  async updateResearchFeedbackDecisionRecord(
    request: ResearchFeedbackDecisionRecordWriteRequest
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    const researchFeedbackDecisionId = request.record.identity.entityId;

    try {
      const updated = await this.prisma.researchFeedbackDecisionRecord.updateMany({
        where: {
          researchFeedbackDecisionId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildResearchFeedbackDecisionUpdateData(request.record)
      });

      if (updated.count === 0) {
        const current = await this.prisma.researchFeedbackDecisionRecord.findUnique({
          where: { researchFeedbackDecisionId }
        });
        if (!current) {
          throw createNotFoundRepositoryError({
            entityType: "research_feedback_decision",
            entityId: researchFeedbackDecisionId,
            operation: "update"
          });
        }

        if (request.expectedVersion !== null) {
          throw createVersionMismatchRepositoryError({
            entityType: "research_feedback_decision",
            entityId: researchFeedbackDecisionId,
            operation: "update",
            expectedVersion: request.expectedVersion,
            actualVersion: current.version
          });
        }

        throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
          operation: "update",
          entityType: "research_feedback_decision",
          entityId: researchFeedbackDecisionId
        });
      }

      const row = await this.prisma.researchFeedbackDecisionRecord.findUnique({
        where: { researchFeedbackDecisionId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "research_feedback_decision",
          entityId: researchFeedbackDecisionId,
          operation: "update"
        });
      }

      return hydrateResearchFeedbackDecisionRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, {
          entityId: researchFeedbackDecisionId,
          operation: "update",
          setupDefinitionId: request.record.setupDefinitionId,
          researchHypothesisId: request.record.researchHypothesisId,
          setupAggregateResultId: request.record.setupAggregateResultId
        });
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "research_feedback_decision",
        entityId: researchFeedbackDecisionId,
        expectedVersion: request.expectedVersion
      });
    }
  }
}
