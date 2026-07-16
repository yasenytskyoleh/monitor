import { Prisma } from "../generated/prisma/client.js";
import type { SetupRefinementRequestDurableRecord } from "../storage/setup-refinement-request-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  SetupRefinementRequestRecordWriteRequest,
  SetupRefinementRequestRelationalRepositoryAdapter
} from "./setup-refinement-request-relational-repository-adapter.js";

type PrismaSetupRefinementRequestModel =
  Prisma.SetupRefinementRequestRecordGetPayload<object>;

type PrismaSetupRefinementRequestDelegate = {
  create(args: {
    data: Prisma.SetupRefinementRequestRecordUncheckedCreateInput;
  }): Promise<PrismaSetupRefinementRequestModel>;
  findMany(args: {
    where:
      | {
          setupDefinitionId: string;
        }
      | {
          sourceResearchDecisionApprovalId: string;
        };
    orderBy: {
      setupRefinementRequestId: "asc" | "desc";
    };
  }): Promise<PrismaSetupRefinementRequestModel[]>;
  findUnique(args: {
    where: {
      setupRefinementRequestId: string;
    };
  }): Promise<PrismaSetupRefinementRequestModel | null>;
};

type PrismaSetupDefinitionReferenceDelegate = {
  findUnique(args: {
    where: {
      setupDefinitionId: string;
    };
  }): Promise<{ setupDefinitionId: string } | null>;
};

type PrismaResearchDecisionApprovalReferenceDelegate = {
  findUnique(args: {
    where: {
      researchDecisionApprovalId: string;
    };
  }): Promise<
    | {
        researchDecisionApprovalId: string;
        setupDefinitionId: string;
        researchFeedbackDecisionId: string;
      }
    | null
  >;
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

export type SetupRefinementRequestRelationalPrismaClient = {
  setupRefinementRequestRecord: PrismaSetupRefinementRequestDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
  researchDecisionApprovalRecord: PrismaResearchDecisionApprovalReferenceDelegate;
  researchFeedbackDecisionRecord: PrismaResearchFeedbackDecisionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "setup_refinement_request";
  entityId?: string;
};

type ReferenceContext = {
  entityId: string;
  operation: "create";
  setupDefinitionId: string;
  researchDecisionApprovalId: string;
  researchFeedbackDecisionId: string;
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
  createdBySource: SetupRefinementRequestDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SetupRefinementRequestDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): SetupRefinementRequestDurableRecord["metadata"] => ({
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

const hydrateSetupRefinementRequest = (
  row: PrismaSetupRefinementRequestModel
): SetupRefinementRequestDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_refinement_request",
    entityId: row.setupRefinementRequestId,
    version: row.version,
    relatedEntityIds: [
      row.setupDefinitionId,
      row.sourceResearchDecisionApprovalId,
      row.sourceResearchFeedbackDecisionId
    ]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  setupDefinitionId: row.setupDefinitionId,
  sourceResearchDecisionApprovalId: row.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: row.sourceResearchFeedbackDecisionId,
  refinementStatus: row.refinementStatus,
  refinementRationaleSummary: row.refinementRationaleSummary,
  requestedChangesSummary: row.requestedChangesSummary,
  evidenceReferences: [...row.evidenceReferences],
  requestedBy: row.requestedBy,
  requestedAtUtc: row.requestedAtUtc.toISOString(),
  assignedReviewerId: row.assignedReviewerId,
  assignedOwnerId: row.assignedOwnerId
});

const buildSetupRefinementRequestCreateData = (
  record: SetupRefinementRequestDurableRecord
): Prisma.SetupRefinementRequestRecordUncheckedCreateInput => ({
  setupRefinementRequestId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupDefinitionId: record.setupDefinitionId,
  sourceResearchDecisionApprovalId: record.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: record.sourceResearchFeedbackDecisionId,
  refinementStatus: record.refinementStatus,
  refinementRationaleSummary: record.refinementRationaleSummary,
  requestedChangesSummary: record.requestedChangesSummary,
  evidenceReferences: [...record.evidenceReferences],
  requestedBy: record.requestedBy,
  requestedAtUtc: new Date(record.requestedAtUtc),
  assignedReviewerId: record.assignedReviewerId,
  assignedOwnerId: record.assignedOwnerId,
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
  prisma: SetupRefinementRequestRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
    where: { setupDefinitionId: context.setupDefinitionId }
  });
  if (!setupDefinition) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition",
      referenceEntityId: context.setupDefinitionId
    });
  }

  const approval = await prisma.researchDecisionApprovalRecord.findUnique({
    where: { researchDecisionApprovalId: context.researchDecisionApprovalId }
  });
  if (!approval) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }

  const feedbackDecision = await prisma.researchFeedbackDecisionRecord.findUnique({
    where: { researchFeedbackDecisionId: context.researchFeedbackDecisionId }
  });
  if (!feedbackDecision) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }

  if (approval.setupDefinitionId !== context.setupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }

  if (approval.researchFeedbackDecisionId !== context.researchFeedbackDecisionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }

  if (feedbackDecision.setupDefinitionId !== context.setupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: SetupRefinementRequestRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_decision_approval",
        referenceEntityId: context.researchDecisionApprovalId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_refinement_request",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }
};

export class PrismaSetupRefinementRequestRelationalRepositoryAdapter
  implements SetupRefinementRequestRelationalRepositoryAdapter
{
  constructor(private readonly prisma: SetupRefinementRequestRelationalPrismaClient) {}

  async loadSetupRefinementRequest(
    setupRefinementRequestId: string
  ): Promise<SetupRefinementRequestDurableRecord | null> {
    try {
      const row = await this.prisma.setupRefinementRequestRecord.findUnique({
        where: { setupRefinementRequestId }
      });
      return row ? hydrateSetupRefinementRequest(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "setup_refinement_request",
        entityId: setupRefinementRequestId
      });
    }
  }

  async listSetupRefinementRequestsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupRefinementRequestDurableRecord[]> {
    try {
      const rows = await this.prisma.setupRefinementRequestRecord.findMany({
        where: { setupDefinitionId },
        orderBy: { setupRefinementRequestId: "asc" }
      });
      return rows.map((row) => hydrateSetupRefinementRequest(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_refinement_request",
        entityId: setupDefinitionId
      });
    }
  }

  async listSetupRefinementRequestsByResearchDecisionApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupRefinementRequestDurableRecord[]> {
    try {
      const rows = await this.prisma.setupRefinementRequestRecord.findMany({
        where: { sourceResearchDecisionApprovalId: researchDecisionApprovalId },
        orderBy: { setupRefinementRequestId: "asc" }
      });
      return rows.map((row) => hydrateSetupRefinementRequest(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_refinement_request",
        entityId: researchDecisionApprovalId
      });
    }
  }

  async insertSetupRefinementRequest(
    request: SetupRefinementRequestRecordWriteRequest
  ): Promise<SetupRefinementRequestDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      setupDefinitionId: request.record.setupDefinitionId,
      researchDecisionApprovalId: request.record.sourceResearchDecisionApprovalId,
      researchFeedbackDecisionId: request.record.sourceResearchFeedbackDecisionId
    };

    const validationError = await findReferenceValidationError(this.prisma, referenceContext);
    if (validationError) {
      throw validationError;
    }

    try {
      const row = await this.prisma.setupRefinementRequestRecord.create({
        data: buildSetupRefinementRequestCreateData(request.record)
      });
      return hydrateSetupRefinementRequest(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_refinement_request",
        entityId: request.record.identity.entityId
      });
    }
  }
}
