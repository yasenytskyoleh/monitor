import { Prisma } from "../generated/prisma/client.js";
import type { ResearchReviewDecisionDurableRecord } from "../storage/research-review-decision-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  ResearchReviewDecisionRecordWriteRequest,
  ResearchReviewDecisionRelationalRepositoryAdapter
} from "./research-review-decision-relational-repository-adapter.js";

type PrismaResearchReviewDecisionRecordModel =
  Prisma.ResearchReviewDecisionRecordGetPayload<object>;

type PrismaResearchReviewDecisionDelegate = {
  create(args: {
    data: Prisma.ResearchReviewDecisionRecordUncheckedCreateInput;
  }): Promise<PrismaResearchReviewDecisionRecordModel>;
  findMany(args: {
    where:
      | {
          researchReviewPacketId: string;
        }
      | {
          setupFamilyId: string;
        };
    orderBy: {
      researchReviewDecisionId: "asc" | "desc";
    };
  }): Promise<PrismaResearchReviewDecisionRecordModel[]>;
  findUnique(args: {
    where: {
      researchReviewDecisionId: string;
    };
  }): Promise<PrismaResearchReviewDecisionRecordModel | null>;
};

type PrismaResearchHypothesisReferenceDelegate = {
  findUnique(args: {
    where: {
      researchHypothesisId: string;
    };
  }): Promise<{ researchHypothesisId: string } | null>;
};

export type ResearchReviewDecisionRelationalPrismaClient = {
  researchReviewDecisionRecord: PrismaResearchReviewDecisionDelegate;
  researchHypothesisRecord: PrismaResearchHypothesisReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "research_review_decision";
  entityId?: string;
};

type ReferenceContext = {
  entityId: string;
  operation: "create";
  researchHypothesisId: string | null;
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
      retryDisposition: "retryable"
    }
  );
};

const buildMetadata = (row: {
  originRunId: string | null;
  originTransitionId: string | null;
  createdBySource: ResearchReviewDecisionDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: ResearchReviewDecisionDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): ResearchReviewDecisionDurableRecord["metadata"] => ({
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

const hydrateResearchReviewDecisionRecord = (
  row: PrismaResearchReviewDecisionRecordModel
): ResearchReviewDecisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_review_decision",
    entityId: row.researchReviewDecisionId,
    version: row.version,
    relatedEntityIds: [
      row.researchReviewPacketId,
      row.setupFamilyId,
      row.setupRevisionId,
      row.researchHypothesisId
    ].filter((value): value is string => Boolean(value))
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  decisionStatus: row.decisionStatus,
  researchReviewPacketId: row.researchReviewPacketId,
  setupFamilyId: row.setupFamilyId,
  setupRevisionId: row.setupRevisionId,
  researchHypothesisId: row.researchHypothesisId,
  reviewedBy: row.reviewedBy,
  reviewedAtUtc: row.reviewedAtUtc.toISOString(),
  decisionOutcome: row.decisionOutcome,
  reviewerNotes: row.reviewerNotes,
  authorizedNextAction: row.authorizedNextAction
});

const buildResearchReviewDecisionCreateData = (
  record: ResearchReviewDecisionDurableRecord
): Prisma.ResearchReviewDecisionRecordUncheckedCreateInput => ({
  researchReviewDecisionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  decisionStatus: record.decisionStatus,
  researchReviewPacketId: record.researchReviewPacketId,
  setupFamilyId: record.setupFamilyId,
  setupRevisionId: record.setupRevisionId,
  researchHypothesisId: record.researchHypothesisId,
  reviewedBy: record.reviewedBy,
  reviewedAtUtc: new Date(record.reviewedAtUtc),
  decisionOutcome: record.decisionOutcome,
  reviewerNotes: record.reviewerNotes,
  authorizedNextAction: record.authorizedNextAction,
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

const findReferenceValidationError = async (
  prisma: ResearchReviewDecisionRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  if (!context.researchHypothesisId) {
    return null;
  }

  const hypothesis = await prisma.researchHypothesisRecord.findUnique({
    where: { researchHypothesisId: context.researchHypothesisId }
  });
  if (!hypothesis) {
    return createInvalidReferenceRepositoryError({
      entityType: "research_review_decision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_hypothesis",
      referenceEntityId: context.researchHypothesisId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: ResearchReviewDecisionRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  if (!context.researchHypothesisId) {
    return createInvalidReferenceRepositoryError({
      entityType: "research_review_decision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_hypothesis",
      referenceEntityId: "unknown"
    });
  }

  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "research_review_decision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_hypothesis",
        referenceEntityId: context.researchHypothesisId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "research_review_decision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_hypothesis",
      referenceEntityId: context.researchHypothesisId
    });
  }
};

export class PrismaResearchReviewDecisionRelationalRepositoryAdapter
  implements ResearchReviewDecisionRelationalRepositoryAdapter
{
  constructor(private readonly prisma: ResearchReviewDecisionRelationalPrismaClient) {}

  async loadResearchReviewDecisionRecord(
    researchReviewDecisionId: string
  ): Promise<ResearchReviewDecisionDurableRecord | null> {
    try {
      const row = await this.prisma.researchReviewDecisionRecord.findUnique({
        where: { researchReviewDecisionId }
      });
      return row ? hydrateResearchReviewDecisionRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "research_review_decision",
        entityId: researchReviewDecisionId
      });
    }
  }

  async listResearchReviewDecisionRecordsByReviewPacketId(
    researchReviewPacketId: string
  ): Promise<ResearchReviewDecisionDurableRecord[]> {
    try {
      const rows = await this.prisma.researchReviewDecisionRecord.findMany({
        where: { researchReviewPacketId },
        orderBy: { researchReviewDecisionId: "asc" }
      });
      return rows.map((row) => hydrateResearchReviewDecisionRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "research_review_decision",
        entityId: researchReviewPacketId
      });
    }
  }

  async listResearchReviewDecisionRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<ResearchReviewDecisionDurableRecord[]> {
    try {
      const rows = await this.prisma.researchReviewDecisionRecord.findMany({
        where: { setupFamilyId },
        orderBy: { researchReviewDecisionId: "asc" }
      });
      return rows.map((row) => hydrateResearchReviewDecisionRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "research_review_decision",
        entityId: setupFamilyId
      });
    }
  }

  async insertResearchReviewDecisionRecord(
    request: ResearchReviewDecisionRecordWriteRequest
  ): Promise<ResearchReviewDecisionDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      researchHypothesisId: request.record.researchHypothesisId
    };

    const validationError = await findReferenceValidationError(this.prisma, referenceContext);
    if (validationError) {
      throw validationError;
    }

    try {
      const row = await this.prisma.researchReviewDecisionRecord.create({
        data: buildResearchReviewDecisionCreateData(request.record)
      });
      return hydrateResearchReviewDecisionRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error) && referenceContext.researchHypothesisId) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "research_review_decision",
        entityId: request.record.identity.entityId
      });
    }
  }
}
