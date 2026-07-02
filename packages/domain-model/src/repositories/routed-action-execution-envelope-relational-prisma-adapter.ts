import { Prisma } from "../generated/prisma/client.js";
import type {
  ResearchReviewDecisionDurableRecord
} from "../storage/research-review-decision-relational-slice.js";
import type {
  RoutedActionExecutionEnvelopeDurableRecord
} from "../storage/routed-action-execution-envelope-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  RoutedActionExecutionEnvelopeRecordWriteRequest,
  RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
} from "./routed-action-execution-envelope-relational-repository-adapter.js";

type PrismaRoutedActionExecutionEnvelopeRecordModel =
  Prisma.RoutedActionExecutionEnvelopeRecordGetPayload<object>;

type PrismaRoutedActionExecutionEnvelopeDelegate = {
  create(args: {
    data: Prisma.RoutedActionExecutionEnvelopeRecordUncheckedCreateInput;
  }): Promise<PrismaRoutedActionExecutionEnvelopeRecordModel>;
  findMany(args: {
    where: {
      sourceReviewDecisionId: string;
    };
    orderBy: {
      routedActionExecutionEnvelopeId: "asc" | "desc";
    };
  }): Promise<PrismaRoutedActionExecutionEnvelopeRecordModel[]>;
  findUnique(args: {
    where: {
      routedActionExecutionEnvelopeId: string;
    };
  }): Promise<PrismaRoutedActionExecutionEnvelopeRecordModel | null>;
};

type PrismaResearchReviewDecisionReferenceDelegate = {
  findUnique(args: {
    where: {
      researchReviewDecisionId: string;
    };
  }): Promise<{ researchReviewDecisionId: string } | null>;
};

export type RoutedActionExecutionEnvelopeRelationalPrismaClient = {
  routedActionExecutionEnvelopeRecord: PrismaRoutedActionExecutionEnvelopeDelegate;
  researchReviewDecisionRecord: PrismaResearchReviewDecisionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "routed_action_execution_envelope";
  entityId?: string;
};

type ReferenceContext = {
  entityId: string;
  operation: "create";
  sourceReviewDecisionId: string;
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

const normalizeJsonSnapshot = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

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
}): RoutedActionExecutionEnvelopeDurableRecord["metadata"] => ({
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

const hydrateRoutedActionExecutionEnvelopeRecord = (
  row: PrismaRoutedActionExecutionEnvelopeRecordModel
): RoutedActionExecutionEnvelopeDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "routed_action_execution_envelope",
    entityId: row.routedActionExecutionEnvelopeId,
    version: row.version,
    relatedEntityIds: [
      row.sourceRoutingResultId,
      row.sourceReviewDecisionId,
      (row.targetEntityRefs as { setupFamilyId?: string } | null)?.setupFamilyId,
      (row.targetEntityRefs as { setupDefinitionId?: string } | null)?.setupDefinitionId,
      (row.targetEntityRefs as { setupRevisionId?: string } | null)?.setupRevisionId,
      (row.targetEntityRefs as { researchHypothesisId?: string } | null)?.researchHypothesisId,
      (row.targetEntityRefs as { researchFeedbackDecisionId?: string } | null)
        ?.researchFeedbackDecisionId,
      (row.targetEntityRefs as { researchDecisionApprovalId?: string } | null)
        ?.researchDecisionApprovalId
    ].filter((value): value is string => Boolean(value))
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  executionStatus: row.executionStatus,
  sourceRoutingResultId: row.sourceRoutingResultId,
  sourceReviewDecisionId: row.sourceReviewDecisionId,
  actionTarget: row.actionTarget,
  actionCommandType: row.actionCommandType,
  targetEntityRefs: normalizeJsonSnapshot(
    row.targetEntityRefs
  ) as RoutedActionExecutionEnvelopeDurableRecord["targetEntityRefs"],
  routeMetadataSnapshot: normalizeJsonSnapshot(
    row.routeMetadataSnapshot
  ) as RoutedActionExecutionEnvelopeDurableRecord["routeMetadataSnapshot"],
  executionPayloadSnapshot: normalizeJsonSnapshot(
    row.executionPayloadSnapshot
  ) as RoutedActionExecutionEnvelopeDurableRecord["executionPayloadSnapshot"],
  preparedBy: row.preparedBy,
  preparedAtUtc: row.preparedAtUtc.toISOString(),
  originRunId: row.envelopeOriginRunId,
  notes: row.notes
});

const buildRoutedActionExecutionEnvelopeCreateData = (
  record: RoutedActionExecutionEnvelopeDurableRecord
): Prisma.RoutedActionExecutionEnvelopeRecordUncheckedCreateInput => ({
  routedActionExecutionEnvelopeId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  executionStatus: record.executionStatus,
  sourceRoutingResultId: record.sourceRoutingResultId,
  sourceReviewDecisionId: record.sourceReviewDecisionId,
  actionTarget: record.actionTarget,
  actionCommandType: record.actionCommandType,
  targetEntityRefs: normalizeJsonSnapshot(record.targetEntityRefs) as Prisma.InputJsonValue,
  routeMetadataSnapshot: normalizeJsonSnapshot(
    record.routeMetadataSnapshot
  ) as Prisma.InputJsonValue,
  executionPayloadSnapshot: normalizeJsonSnapshot(
    record.executionPayloadSnapshot
  ) as Prisma.InputJsonValue,
  preparedBy: record.preparedBy,
  preparedAtUtc: new Date(record.preparedAtUtc),
  envelopeOriginRunId: record.originRunId,
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

const findReferenceValidationError = async (
  prisma: RoutedActionExecutionEnvelopeRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const reviewDecision = await prisma.researchReviewDecisionRecord.findUnique({
    where: { researchReviewDecisionId: context.sourceReviewDecisionId }
  });
  if (!reviewDecision) {
    return createInvalidReferenceRepositoryError({
      entityType: "routed_action_execution_envelope",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_review_decision",
      referenceEntityId: context.sourceReviewDecisionId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: RoutedActionExecutionEnvelopeRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "routed_action_execution_envelope",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_review_decision",
        referenceEntityId: context.sourceReviewDecisionId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "routed_action_execution_envelope",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_review_decision",
      referenceEntityId: context.sourceReviewDecisionId
    });
  }
};

export class PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter
  implements RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
{
  constructor(private readonly prisma: RoutedActionExecutionEnvelopeRelationalPrismaClient) {}

  async loadRoutedActionExecutionEnvelopeRecord(
    routedActionExecutionEnvelopeId: string
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord | null> {
    try {
      const row = await this.prisma.routedActionExecutionEnvelopeRecord.findUnique({
        where: { routedActionExecutionEnvelopeId }
      });
      return row ? hydrateRoutedActionExecutionEnvelopeRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "routed_action_execution_envelope",
        entityId: routedActionExecutionEnvelopeId
      });
    }
  }

  async listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId(
    sourceReviewDecisionId: string
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord[]> {
    try {
      const rows = await this.prisma.routedActionExecutionEnvelopeRecord.findMany({
        where: { sourceReviewDecisionId },
        orderBy: { routedActionExecutionEnvelopeId: "asc" }
      });
      return rows.map((row) => hydrateRoutedActionExecutionEnvelopeRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "routed_action_execution_envelope",
        entityId: sourceReviewDecisionId
      });
    }
  }

  async insertRoutedActionExecutionEnvelopeRecord(
    request: RoutedActionExecutionEnvelopeRecordWriteRequest
  ): Promise<RoutedActionExecutionEnvelopeDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      sourceReviewDecisionId: request.record.sourceReviewDecisionId
    };

    const validationError = await findReferenceValidationError(this.prisma, referenceContext);
    if (validationError) {
      throw validationError;
    }

    try {
      const row = await this.prisma.routedActionExecutionEnvelopeRecord.create({
        data: buildRoutedActionExecutionEnvelopeCreateData(request.record)
      });
      return hydrateRoutedActionExecutionEnvelopeRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "routed_action_execution_envelope",
        entityId: request.record.identity.entityId
      });
    }
  }
}
