import { Prisma } from "../generated/prisma/client.js";
import type { ReviewDecisionRoutingResultDurableRecord } from "../storage/review-decision-routing-result-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  ReviewDecisionRoutingResultRecordWriteRequest,
  ReviewDecisionRoutingResultRelationalRepositoryAdapter
} from "./review-decision-routing-result-relational-repository-adapter.js";

type PrismaReviewDecisionRoutingResultRecordModel =
  Prisma.ReviewDecisionRoutingResultRecordGetPayload<object>;

type PrismaReviewDecisionRoutingResultDelegate = {
  create(args: {
    data: Prisma.ReviewDecisionRoutingResultRecordUncheckedCreateInput;
  }): Promise<PrismaReviewDecisionRoutingResultRecordModel>;
  findMany(args: {
    where: { researchReviewDecisionId: string };
    orderBy: { reviewDecisionRoutingResultId: "asc" | "desc" };
  }): Promise<PrismaReviewDecisionRoutingResultRecordModel[]>;
  findUnique(args: {
    where: { reviewDecisionRoutingResultId: string };
  }): Promise<PrismaReviewDecisionRoutingResultRecordModel | null>;
};

type PrismaResearchReviewDecisionReferenceDelegate = {
  findUnique(args: {
    where: { researchReviewDecisionId: string };
  }): Promise<{ researchReviewDecisionId: string } | null>;
};

export type ReviewDecisionRoutingResultRelationalPrismaClient = {
  reviewDecisionRoutingResultRecord: PrismaReviewDecisionRoutingResultDelegate;
  researchReviewDecisionRecord: PrismaResearchReviewDecisionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "review_decision_routing_result";
  entityId?: string;
};

type ReferenceContext = {
  entityId: string;
  operation: "create";
  researchReviewDecisionId: string;
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

const normalizeJsonValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const toTimestampUtc = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;

const buildMetadata = (
  row: PrismaReviewDecisionRoutingResultRecordModel
): ReviewDecisionRoutingResultDurableRecord["metadata"] => ({
  originRunId: row.originRunId,
  originTransitionId: row.originTransitionId,
  createdBySource: row.createdBySource,
  lastUpdatedBySource: row.lastUpdatedBySource,
  traceId: row.traceId,
  sourceObservedAtUtc: toTimestampUtc(row.sourceObservedAtUtc),
  ...(row.metadataNotes ? { notes: row.metadataNotes } : {})
});

const hydrateReviewDecisionRoutingResultRecord = (
  row: PrismaReviewDecisionRoutingResultRecordModel
): ReviewDecisionRoutingResultDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "review_decision_routing_result",
    entityId: row.reviewDecisionRoutingResultId,
    version: row.version,
    relatedEntityIds: [
      row.researchReviewDecisionId,
      row.setupFamilyId,
      row.setupRevisionId
    ].filter((value): value is string => Boolean(value))
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  routingStatus: row.routingStatus,
  researchReviewDecisionId: row.researchReviewDecisionId,
  setupFamilyId: row.setupFamilyId,
  setupRevisionId: row.setupRevisionId,
  decisionOutcome: row.decisionOutcome,
  authorizedNextAction: row.authorizedNextAction,
  target: row.downstreamTarget,
  downstreamCommandType: row.downstreamCommandType,
  routedAtUtc: row.routedAtUtc.toISOString(),
  reason: row.reason,
  warnings: normalizeJsonValue(row.warnings) as string[]
});

const buildCreateData = (
  record: ReviewDecisionRoutingResultDurableRecord
): Prisma.ReviewDecisionRoutingResultRecordUncheckedCreateInput => ({
  reviewDecisionRoutingResultId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  routingStatus: record.routingStatus,
  researchReviewDecisionId: record.researchReviewDecisionId,
  setupFamilyId: record.setupFamilyId,
  setupRevisionId: record.setupRevisionId,
  decisionOutcome: record.decisionOutcome,
  authorizedNextAction: record.authorizedNextAction,
  downstreamTarget: record.target,
  downstreamCommandType: record.downstreamCommandType,
  routedAtUtc: new Date(record.routedAtUtc),
  reason: record.reason,
  warnings: normalizeJsonValue(record.warnings) as Prisma.InputJsonValue,
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

const buildInvalidReferenceError = (
  context: ReferenceContext
): RepositoryError =>
  createInvalidReferenceRepositoryError({
    entityType: "review_decision_routing_result",
    entityId: context.entityId,
    operation: context.operation,
    referenceEntityType: "research_review_decision",
    referenceEntityId: context.researchReviewDecisionId
  });

const findReferenceValidationError = async (
  prisma: ReviewDecisionRoutingResultRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const reviewDecision = await prisma.researchReviewDecisionRecord.findUnique({
    where: { researchReviewDecisionId: context.researchReviewDecisionId }
  });
  return reviewDecision ? null : buildInvalidReferenceError(context);
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: ReviewDecisionRoutingResultRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (await findReferenceValidationError(prisma, context)) ?? buildInvalidReferenceError(context);
  } catch {
    return buildInvalidReferenceError(context);
  }
};

export class PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter
  implements ReviewDecisionRoutingResultRelationalRepositoryAdapter
{
  constructor(private readonly prisma: ReviewDecisionRoutingResultRelationalPrismaClient) {}

  async loadReviewDecisionRoutingResultRecord(
    reviewDecisionRoutingResultId: string
  ): Promise<ReviewDecisionRoutingResultDurableRecord | null> {
    try {
      const row = await this.prisma.reviewDecisionRoutingResultRecord.findUnique({
        where: { reviewDecisionRoutingResultId }
      });
      return row ? hydrateReviewDecisionRoutingResultRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "review_decision_routing_result",
        entityId: reviewDecisionRoutingResultId
      });
    }
  }

  async listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId(
    researchReviewDecisionId: string
  ): Promise<ReviewDecisionRoutingResultDurableRecord[]> {
    try {
      const rows = await this.prisma.reviewDecisionRoutingResultRecord.findMany({
        where: { researchReviewDecisionId },
        orderBy: { reviewDecisionRoutingResultId: "asc" }
      });
      return rows.map((row) => hydrateReviewDecisionRoutingResultRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "review_decision_routing_result",
        entityId: researchReviewDecisionId
      });
    }
  }

  async insertReviewDecisionRoutingResultRecord(
    request: ReviewDecisionRoutingResultRecordWriteRequest
  ): Promise<ReviewDecisionRoutingResultDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      researchReviewDecisionId: request.record.researchReviewDecisionId
    };
    const validationError = await findReferenceValidationError(this.prisma, referenceContext);
    if (validationError) {
      throw validationError;
    }

    try {
      const row = await this.prisma.reviewDecisionRoutingResultRecord.create({
        data: buildCreateData(request.record)
      });
      return hydrateReviewDecisionRoutingResultRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "review_decision_routing_result",
        entityId: request.record.identity.entityId
      });
    }
  }
}
