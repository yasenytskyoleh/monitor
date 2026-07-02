import { Prisma } from "../generated/prisma/client.js";
import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  ResearchDecisionApprovalRecordWriteRequest,
  ResearchDecisionApprovalRelationalRepositoryAdapter
} from "./research-decision-approval-relational-repository-adapter.js";

type PrismaResearchDecisionApprovalRecordModel =
  Prisma.ResearchDecisionApprovalRecordGetPayload<object>;

type PrismaResearchDecisionApprovalDelegate = {
  create(args: {
    data: Prisma.ResearchDecisionApprovalRecordUncheckedCreateInput;
  }): Promise<PrismaResearchDecisionApprovalRecordModel>;
  findMany(args: {
    where: {
      researchFeedbackDecisionId: string;
    };
    orderBy: {
      researchDecisionApprovalId: "asc" | "desc";
    };
  }): Promise<PrismaResearchDecisionApprovalRecordModel[]>;
  findUnique(args: {
    where: {
      researchDecisionApprovalId: string;
    };
  }): Promise<PrismaResearchDecisionApprovalRecordModel | null>;
};

type PrismaResearchFeedbackDecisionReferenceDelegate = {
  findUnique(args: {
    where: {
      researchFeedbackDecisionId: string;
    };
  }): Promise<
    | {
        researchFeedbackDecisionId: string;
        setupDefinitionId: string;
      }
    | null
  >;
};

type PrismaSetupDefinitionReferenceDelegate = {
  findUnique(args: {
    where: {
      setupDefinitionId: string;
    };
  }): Promise<{ setupDefinitionId: string } | null>;
};

export type ResearchDecisionApprovalRelationalPrismaClient = {
  researchDecisionApprovalRecord: PrismaResearchDecisionApprovalDelegate;
  researchFeedbackDecisionRecord: PrismaResearchFeedbackDecisionReferenceDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "research_decision_approval";
  entityId?: string;
};

type ReferenceContext = {
  entityId: string;
  operation: "create";
  researchFeedbackDecisionId: string;
  setupDefinitionId: string;
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
  createdBySource: ResearchDecisionApprovalDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: ResearchDecisionApprovalDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): ResearchDecisionApprovalDurableRecord["metadata"] => ({
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

const hydrateResearchDecisionApprovalRecord = (
  row: PrismaResearchDecisionApprovalRecordModel
): ResearchDecisionApprovalDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "research_decision_approval",
    entityId: row.researchDecisionApprovalId,
    version: row.version,
    relatedEntityIds: [row.researchFeedbackDecisionId, row.setupDefinitionId]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  approvalStatus: row.approvalStatus,
  researchFeedbackDecisionId: row.researchFeedbackDecisionId,
  setupDefinitionId: row.setupDefinitionId,
  reviewedBy: row.reviewedBy,
  reviewedAtUtc: row.reviewedAtUtc.toISOString(),
  approvalOutcome: row.approvalOutcome,
  reviewerNotes: row.reviewerNotes,
  authorizedNextAction: row.authorizedNextAction
});

const buildResearchDecisionApprovalCreateData = (
  record: ResearchDecisionApprovalDurableRecord
): Prisma.ResearchDecisionApprovalRecordUncheckedCreateInput => ({
  researchDecisionApprovalId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  approvalStatus: record.approvalStatus,
  researchFeedbackDecisionId: record.researchFeedbackDecisionId,
  setupDefinitionId: record.setupDefinitionId,
  reviewedBy: record.reviewedBy,
  reviewedAtUtc: new Date(record.reviewedAtUtc),
  approvalOutcome: record.approvalOutcome,
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
  prisma: ResearchDecisionApprovalRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const feedbackDecision = await prisma.researchFeedbackDecisionRecord.findUnique({
    where: { researchFeedbackDecisionId: context.researchFeedbackDecisionId }
  });
  if (!feedbackDecision) {
    return createInvalidReferenceRepositoryError({
      entityType: "research_decision_approval",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }

  const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
    where: { setupDefinitionId: context.setupDefinitionId }
  });
  if (!setupDefinition) {
    return createInvalidReferenceRepositoryError({
      entityType: "research_decision_approval",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition",
      referenceEntityId: context.setupDefinitionId
    });
  }

  if (feedbackDecision.setupDefinitionId !== context.setupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "research_decision_approval",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: ResearchDecisionApprovalRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "research_decision_approval",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: context.researchFeedbackDecisionId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "research_decision_approval",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }
};

export class PrismaResearchDecisionApprovalRelationalRepositoryAdapter
  implements ResearchDecisionApprovalRelationalRepositoryAdapter
{
  constructor(private readonly prisma: ResearchDecisionApprovalRelationalPrismaClient) {}

  async loadResearchDecisionApprovalRecord(
    researchDecisionApprovalId: string
  ): Promise<ResearchDecisionApprovalDurableRecord | null> {
    try {
      const row = await this.prisma.researchDecisionApprovalRecord.findUnique({
        where: { researchDecisionApprovalId }
      });
      return row ? hydrateResearchDecisionApprovalRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "research_decision_approval",
        entityId: researchDecisionApprovalId
      });
    }
  }

  async listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId(
    researchFeedbackDecisionId: string
  ): Promise<ResearchDecisionApprovalDurableRecord[]> {
    try {
      const rows = await this.prisma.researchDecisionApprovalRecord.findMany({
        where: { researchFeedbackDecisionId },
        orderBy: { researchDecisionApprovalId: "asc" }
      });
      return rows.map((row) => hydrateResearchDecisionApprovalRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "research_decision_approval",
        entityId: researchFeedbackDecisionId
      });
    }
  }

  async insertResearchDecisionApprovalRecord(
    request: ResearchDecisionApprovalRecordWriteRequest
  ): Promise<ResearchDecisionApprovalDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      researchFeedbackDecisionId: request.record.researchFeedbackDecisionId,
      setupDefinitionId: request.record.setupDefinitionId
    };

    try {
      const referenceValidationError = await findReferenceValidationError(
        this.prisma,
        referenceContext
      );
      if (referenceValidationError) {
        throw referenceValidationError;
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "research_decision_approval",
        entityId: request.record.identity.entityId
      });
    }

    try {
      const row = await this.prisma.researchDecisionApprovalRecord.create({
        data: buildResearchDecisionApprovalCreateData(request.record)
      });
      return hydrateResearchDecisionApprovalRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "research_decision_approval",
        entityId: request.record.identity.entityId
      });
    }
  }
}
