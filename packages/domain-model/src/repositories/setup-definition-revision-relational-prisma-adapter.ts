import { Prisma } from "../generated/prisma/client.js";
import type { SetupDefinitionRevisionDurableRecord } from "../storage/setup-definition-revision-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  SetupDefinitionRevisionRecordWriteRequest,
  SetupDefinitionRevisionRelationalRepositoryAdapter
} from "./setup-definition-revision-relational-repository-adapter.js";

type PrismaSetupDefinitionRevisionModel =
  Prisma.SetupDefinitionRevisionRecordGetPayload<object>;

type PrismaSetupDefinitionRevisionDelegate = {
  create(args: {
    data: Prisma.SetupDefinitionRevisionRecordUncheckedCreateInput;
  }): Promise<PrismaSetupDefinitionRevisionModel>;
  findFirst(args: {
    where: {
      setupFamilyId: string;
    };
    orderBy: {
      setupVersionNumber: "asc" | "desc";
    };
  }): Promise<PrismaSetupDefinitionRevisionModel | null>;
  findMany(args: {
    where: {
      setupFamilyId: string;
    };
    orderBy: {
      setupVersionNumber: "asc" | "desc";
    };
  }): Promise<PrismaSetupDefinitionRevisionModel[]>;
  findUnique(args: {
    where:
      | {
          setupDefinitionRevisionId: string;
        }
      | {
          setupDefinitionId: string;
        };
  }): Promise<PrismaSetupDefinitionRevisionModel | null>;
  updateMany(args: {
    where: {
      setupDefinitionRevisionId: string;
      version?: number;
    };
    data: Prisma.SetupDefinitionRevisionRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

type PrismaSetupDefinitionReferenceDelegate = {
  findUnique(args: {
    where: {
      setupDefinitionId: string;
    };
  }): Promise<{ setupDefinitionId: string } | null>;
};

type PrismaSetupRefinementRequestReferenceDelegate = {
  findUnique(args: {
    where: {
      setupRefinementRequestId: string;
    };
  }): Promise<
    | {
        setupRefinementRequestId: string;
        setupDefinitionId: string;
        sourceResearchDecisionApprovalId: string;
        sourceResearchFeedbackDecisionId: string;
      }
    | null
  >;
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

export type SetupDefinitionRevisionRelationalPrismaClient = {
  setupDefinitionRevisionRecord: PrismaSetupDefinitionRevisionDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
  setupRefinementRequestRecord: PrismaSetupRefinementRequestReferenceDelegate;
  researchDecisionApprovalRecord: PrismaResearchDecisionApprovalReferenceDelegate;
  researchFeedbackDecisionRecord: PrismaResearchFeedbackDecisionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "get_by_reference" | "list_by_reference" | "update";
  entityType: "setup_definition_revision";
  entityId?: string;
  expectedVersion?: number | null;
};

type ReferenceContext = {
  entityId: string;
  operation: "create" | "update";
  setupDefinitionId: string;
  previousSetupDefinitionId: string | null;
  sourceSetupRefinementRequestId: string;
  sourceResearchDecisionApprovalId: string | null;
  sourceResearchFeedbackDecisionId: string | null;
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
  createdBySource: SetupDefinitionRevisionDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SetupDefinitionRevisionDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): SetupDefinitionRevisionDurableRecord["metadata"] => ({
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

const hydrateSetupDefinitionRevisionRecord = (
  row: PrismaSetupDefinitionRevisionModel
): SetupDefinitionRevisionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition_revision",
    entityId: row.setupDefinitionRevisionId,
    version: row.version,
    relatedEntityIds: dedupeRelatedEntityIds([
      row.setupDefinitionId,
      row.previousSetupDefinitionId,
      row.sourceSetupRefinementRequestId,
      row.sourceResearchDecisionApprovalId,
      row.sourceResearchFeedbackDecisionId,
      row.previousRevisionId
    ])
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  setupDefinitionId: row.setupDefinitionId,
  previousSetupDefinitionId: row.previousSetupDefinitionId,
  setupFamilyId: row.setupFamilyId,
  setupVersionNumber: row.setupVersionNumber,
  previousRevisionId: row.previousRevisionId,
  revisionReason: row.revisionReason,
  revisionStatus: row.revisionStatus,
  changedFieldsSummary: row.changedFieldsSummary,
  createdBy: row.createdBy,
  notes: row.notes,
  sourceSetupRefinementRequestId: row.sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId: row.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: row.sourceResearchFeedbackDecisionId
});

const buildSetupDefinitionRevisionCreateData = (
  record: SetupDefinitionRevisionDurableRecord
): Prisma.SetupDefinitionRevisionRecordUncheckedCreateInput => ({
  setupDefinitionRevisionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupDefinitionId: record.setupDefinitionId,
  previousSetupDefinitionId: record.previousSetupDefinitionId,
  setupFamilyId: record.setupFamilyId,
  setupVersionNumber: record.setupVersionNumber,
  previousRevisionId: record.previousRevisionId,
  revisionReason: record.revisionReason,
  revisionStatus: record.revisionStatus,
  changedFieldsSummary: record.changedFieldsSummary,
  createdBy: record.createdBy,
  notes: record.notes,
  sourceSetupRefinementRequestId: record.sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId: record.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: record.sourceResearchFeedbackDecisionId,
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

const buildSetupDefinitionRevisionUpdateData = (
  record: SetupDefinitionRevisionDurableRecord
): Prisma.SetupDefinitionRevisionRecordUncheckedUpdateManyInput => ({
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupDefinitionId: record.setupDefinitionId,
  previousSetupDefinitionId: record.previousSetupDefinitionId,
  setupFamilyId: record.setupFamilyId,
  setupVersionNumber: record.setupVersionNumber,
  previousRevisionId: record.previousRevisionId,
  revisionReason: record.revisionReason,
  revisionStatus: record.revisionStatus,
  changedFieldsSummary: record.changedFieldsSummary,
  createdBy: record.createdBy,
  notes: record.notes,
  sourceSetupRefinementRequestId: record.sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId: record.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: record.sourceResearchFeedbackDecisionId,
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
  prisma: SetupDefinitionRevisionRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
    where: { setupDefinitionId: context.setupDefinitionId }
  });
  if (!setupDefinition) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition",
      referenceEntityId: context.setupDefinitionId
    });
  }

  if (context.previousSetupDefinitionId) {
    const previousSetupDefinition = await prisma.setupDefinitionRecord.findUnique({
      where: { setupDefinitionId: context.previousSetupDefinitionId }
    });
    if (!previousSetupDefinition) {
      return createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: context.previousSetupDefinitionId
      });
    }
  }

  const sourceRequest = await prisma.setupRefinementRequestRecord.findUnique({
    where: { setupRefinementRequestId: context.sourceSetupRefinementRequestId }
  });
  if (!sourceRequest) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_refinement_request",
      referenceEntityId: context.sourceSetupRefinementRequestId
    });
  }

  let approval:
    | {
        researchDecisionApprovalId: string;
        setupDefinitionId: string;
        researchFeedbackDecisionId: string;
      }
    | null = null;
  if (context.sourceResearchDecisionApprovalId) {
    approval = await prisma.researchDecisionApprovalRecord.findUnique({
      where: { researchDecisionApprovalId: context.sourceResearchDecisionApprovalId }
    });
    if (!approval) {
      return createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_decision_approval",
        referenceEntityId: context.sourceResearchDecisionApprovalId
      });
    }
  }

  let feedbackDecision:
    | {
        researchFeedbackDecisionId: string;
        setupDefinitionId: string;
      }
    | null = null;
  if (context.sourceResearchFeedbackDecisionId) {
    feedbackDecision = await prisma.researchFeedbackDecisionRecord.findUnique({
      where: { researchFeedbackDecisionId: context.sourceResearchFeedbackDecisionId }
    });
    if (!feedbackDecision) {
      return createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: context.sourceResearchFeedbackDecisionId
      });
    }
  }

  if (
    context.previousSetupDefinitionId &&
    sourceRequest.setupDefinitionId !== context.previousSetupDefinitionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_refinement_request",
      referenceEntityId: context.sourceSetupRefinementRequestId
    });
  }

  if (
    context.sourceResearchDecisionApprovalId &&
    sourceRequest.sourceResearchDecisionApprovalId !==
      context.sourceResearchDecisionApprovalId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_refinement_request",
      referenceEntityId: context.sourceSetupRefinementRequestId
    });
  }

  if (
    context.sourceResearchFeedbackDecisionId &&
    sourceRequest.sourceResearchFeedbackDecisionId !==
      context.sourceResearchFeedbackDecisionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_refinement_request",
      referenceEntityId: context.sourceSetupRefinementRequestId
    });
  }

  if (approval && approval.setupDefinitionId !== sourceRequest.setupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: approval.researchDecisionApprovalId
    });
  }

  if (
    approval &&
    approval.researchFeedbackDecisionId !==
      sourceRequest.sourceResearchFeedbackDecisionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: approval.researchDecisionApprovalId
    });
  }

  if (
    feedbackDecision &&
    feedbackDecision.setupDefinitionId !== sourceRequest.setupDefinitionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: feedbackDecision.researchFeedbackDecisionId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: SetupDefinitionRevisionRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "setup_refinement_request",
        referenceEntityId: context.sourceSetupRefinementRequestId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_definition_revision",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: context.sourceResearchFeedbackDecisionId
        ? "research_feedback_decision"
        : context.sourceResearchDecisionApprovalId
          ? "research_decision_approval"
          : context.previousSetupDefinitionId
            ? "setup_definition"
            : "setup_refinement_request",
      referenceEntityId:
        context.sourceResearchFeedbackDecisionId ??
        context.sourceResearchDecisionApprovalId ??
        context.previousSetupDefinitionId ??
        context.sourceSetupRefinementRequestId
    });
  }
};

export class PrismaSetupDefinitionRevisionRelationalRepositoryAdapter
  implements SetupDefinitionRevisionRelationalRepositoryAdapter
{
  constructor(private readonly prisma: SetupDefinitionRevisionRelationalPrismaClient) {}

  async loadSetupDefinitionRevisionRecord(
    setupDefinitionRevisionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    try {
      const row = await this.prisma.setupDefinitionRevisionRecord.findUnique({
        where: { setupDefinitionRevisionId }
      });
      return row ? hydrateSetupDefinitionRevisionRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "setup_definition_revision",
        entityId: setupDefinitionRevisionId
      });
    }
  }

  async loadSetupDefinitionRevisionRecordBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    try {
      const row = await this.prisma.setupDefinitionRevisionRecord.findUnique({
        where: { setupDefinitionId }
      });
      return row ? hydrateSetupDefinitionRevisionRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_reference",
        entityType: "setup_definition_revision",
        entityId: setupDefinitionId
      });
    }
  }

  async loadLatestSetupDefinitionRevisionRecordBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    try {
      const row = await this.prisma.setupDefinitionRevisionRecord.findFirst({
        where: { setupFamilyId },
        orderBy: { setupVersionNumber: "desc" }
      });
      return row ? hydrateSetupDefinitionRevisionRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_reference",
        entityType: "setup_definition_revision",
        entityId: setupFamilyId
      });
    }
  }

  async listSetupDefinitionRevisionRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevisionDurableRecord[]> {
    try {
      const rows = await this.prisma.setupDefinitionRevisionRecord.findMany({
        where: { setupFamilyId },
        orderBy: { setupVersionNumber: "asc" }
      });
      return rows.map((row) => hydrateSetupDefinitionRevisionRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_definition_revision",
        entityId: setupFamilyId
      });
    }
  }

  async insertSetupDefinitionRevisionRecord(
    request: SetupDefinitionRevisionRecordWriteRequest
  ): Promise<SetupDefinitionRevisionDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      setupDefinitionId: request.record.setupDefinitionId,
      previousSetupDefinitionId: request.record.previousSetupDefinitionId,
      sourceSetupRefinementRequestId: request.record.sourceSetupRefinementRequestId,
      sourceResearchDecisionApprovalId: request.record.sourceResearchDecisionApprovalId,
      sourceResearchFeedbackDecisionId: request.record.sourceResearchFeedbackDecisionId
    };

    const validationError = await findReferenceValidationError(
      this.prisma,
      referenceContext
    );
    if (validationError) {
      throw validationError;
    }

    try {
      const row = await this.prisma.setupDefinitionRevisionRecord.create({
        data: buildSetupDefinitionRevisionCreateData(request.record)
      });
      return hydrateSetupDefinitionRevisionRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(
          this.prisma,
          referenceContext
        );
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_definition_revision",
        entityId: request.record.identity.entityId
      });
    }
  }

  async updateSetupDefinitionRevisionRecord(
    request: SetupDefinitionRevisionRecordWriteRequest
  ): Promise<SetupDefinitionRevisionDurableRecord> {
    const setupDefinitionRevisionId = request.record.identity.entityId;
    const referenceContext: ReferenceContext = {
      entityId: setupDefinitionRevisionId,
      operation: "update",
      setupDefinitionId: request.record.setupDefinitionId,
      previousSetupDefinitionId: request.record.previousSetupDefinitionId,
      sourceSetupRefinementRequestId: request.record.sourceSetupRefinementRequestId,
      sourceResearchDecisionApprovalId: request.record.sourceResearchDecisionApprovalId,
      sourceResearchFeedbackDecisionId: request.record.sourceResearchFeedbackDecisionId
    };

    const validationError = await findReferenceValidationError(
      this.prisma,
      referenceContext
    );
    if (validationError) {
      throw validationError;
    }

    try {
      const updated = await this.prisma.setupDefinitionRevisionRecord.updateMany({
        where: {
          setupDefinitionRevisionId,
          ...(request.expectedVersion !== null
            ? { version: request.expectedVersion }
            : {})
        },
        data: buildSetupDefinitionRevisionUpdateData(request.record)
      });

      if (updated.count === 0) {
        const current = await this.prisma.setupDefinitionRevisionRecord.findUnique({
          where: { setupDefinitionRevisionId }
        });
        if (!current) {
          throw createNotFoundRepositoryError({
            entityType: "setup_definition_revision",
            entityId: setupDefinitionRevisionId,
            operation: "update"
          });
        }

        if (request.expectedVersion !== null) {
          throw createVersionMismatchRepositoryError({
            entityType: "setup_definition_revision",
            entityId: setupDefinitionRevisionId,
            operation: "update",
            expectedVersion: request.expectedVersion,
            actualVersion: current.version
          });
        }

        throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
          operation: "update",
          entityType: "setup_definition_revision",
          entityId: setupDefinitionRevisionId
        });
      }

      const row = await this.prisma.setupDefinitionRevisionRecord.findUnique({
        where: { setupDefinitionRevisionId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "setup_definition_revision",
          entityId: setupDefinitionRevisionId,
          operation: "update"
        });
      }

      return hydrateSetupDefinitionRevisionRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(
          this.prisma,
          referenceContext
        );
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "setup_definition_revision",
        entityId: setupDefinitionRevisionId,
        expectedVersion: request.expectedVersion
      });
    }
  }
}
