import { Prisma } from "../generated/prisma/client.js";
import type { SetupLifecycleMutationRecordDurableRecord } from "../storage/setup-lifecycle-mutation-record-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  SetupLifecycleMutationRecordRecordWriteRequest,
  SetupLifecycleMutationRecordRelationalRepositoryAdapter
} from "./setup-lifecycle-mutation-record-relational-repository-adapter.js";

type PrismaSetupLifecycleMutationRecordModel =
  Prisma.SetupLifecycleMutationRecordRecordGetPayload<object>;

type PrismaSetupLifecycleMutationRecordDelegate = {
  create(args: {
    data: Prisma.SetupLifecycleMutationRecordRecordUncheckedCreateInput;
  }): Promise<PrismaSetupLifecycleMutationRecordModel>;
  findMany(args: {
    where:
      | {
          setupDefinitionId: string;
        }
      | {
          researchDecisionApprovalId: string;
        };
    orderBy: {
      setupLifecycleMutationRecordId: "asc" | "desc";
    };
  }): Promise<PrismaSetupLifecycleMutationRecordModel[]>;
  findUnique(args: {
    where: {
      setupLifecycleMutationRecordId: string;
    };
  }): Promise<PrismaSetupLifecycleMutationRecordModel | null>;
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

export type SetupLifecycleMutationRecordRelationalPrismaClient = {
  setupLifecycleMutationRecordRecord: PrismaSetupLifecycleMutationRecordDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
  researchDecisionApprovalRecord: PrismaResearchDecisionApprovalReferenceDelegate;
  researchFeedbackDecisionRecord: PrismaResearchFeedbackDecisionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "setup_lifecycle_mutation_record";
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
  createdBySource: SetupLifecycleMutationRecordDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SetupLifecycleMutationRecordDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): SetupLifecycleMutationRecordDurableRecord["metadata"] => ({
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

const hydrateSetupLifecycleMutationRecord = (
  row: PrismaSetupLifecycleMutationRecordModel
): SetupLifecycleMutationRecordDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_lifecycle_mutation_record",
    entityId: row.setupLifecycleMutationRecordId,
    version: row.version,
    relatedEntityIds: [
      row.setupDefinitionId,
      row.researchDecisionApprovalId,
      row.researchFeedbackDecisionId
    ]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  setupDefinitionId: row.setupDefinitionId,
  researchDecisionApprovalId: row.researchDecisionApprovalId,
  researchFeedbackDecisionId: row.researchFeedbackDecisionId,
  previousStatus: row.previousStatus,
  newStatus: row.newStatus,
  approvedAction: row.approvedAction,
  mutatedBy: row.mutatedBy,
  mutatedAtUtc: row.mutatedAtUtc.toISOString(),
  notes: row.notes
});

const buildSetupLifecycleMutationCreateData = (
  record: SetupLifecycleMutationRecordDurableRecord
): Prisma.SetupLifecycleMutationRecordRecordUncheckedCreateInput => ({
  setupLifecycleMutationRecordId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupDefinitionId: record.setupDefinitionId,
  researchDecisionApprovalId: record.researchDecisionApprovalId,
  researchFeedbackDecisionId: record.researchFeedbackDecisionId,
  previousStatus: record.previousStatus,
  newStatus: record.newStatus,
  approvedAction: record.approvedAction,
  mutatedBy: record.mutatedBy,
  mutatedAtUtc: new Date(record.mutatedAtUtc),
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
  prisma: SetupLifecycleMutationRecordRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
    where: { setupDefinitionId: context.setupDefinitionId }
  });
  if (!setupDefinition) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_lifecycle_mutation_record",
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
      entityType: "setup_lifecycle_mutation_record",
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
      entityType: "setup_lifecycle_mutation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }

  if (approval.setupDefinitionId !== context.setupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_lifecycle_mutation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }

  if (approval.researchFeedbackDecisionId !== context.researchFeedbackDecisionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_lifecycle_mutation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }

  if (feedbackDecision.setupDefinitionId !== context.setupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_lifecycle_mutation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_feedback_decision",
      referenceEntityId: context.researchFeedbackDecisionId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: SetupLifecycleMutationRecordRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "research_decision_approval",
        referenceEntityId: context.researchDecisionApprovalId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_lifecycle_mutation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "research_decision_approval",
      referenceEntityId: context.researchDecisionApprovalId
    });
  }
};

export class PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter
  implements SetupLifecycleMutationRecordRelationalRepositoryAdapter
{
  constructor(private readonly prisma: SetupLifecycleMutationRecordRelationalPrismaClient) {}

  async loadSetupLifecycleMutationRecord(
    setupLifecycleMutationRecordId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord | null> {
    try {
      const row = await this.prisma.setupLifecycleMutationRecordRecord.findUnique({
        where: { setupLifecycleMutationRecordId }
      });
      return row ? hydrateSetupLifecycleMutationRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "setup_lifecycle_mutation_record",
        entityId: setupLifecycleMutationRecordId
      });
    }
  }

  async listSetupLifecycleMutationRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord[]> {
    try {
      const rows = await this.prisma.setupLifecycleMutationRecordRecord.findMany({
        where: { setupDefinitionId },
        orderBy: { setupLifecycleMutationRecordId: "asc" }
      });
      return rows.map((row) => hydrateSetupLifecycleMutationRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_lifecycle_mutation_record",
        entityId: setupDefinitionId
      });
    }
  }

  async listSetupLifecycleMutationRecordsByResearchDecisionApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord[]> {
    try {
      const rows = await this.prisma.setupLifecycleMutationRecordRecord.findMany({
        where: { researchDecisionApprovalId },
        orderBy: { setupLifecycleMutationRecordId: "asc" }
      });
      return rows.map((row) => hydrateSetupLifecycleMutationRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_lifecycle_mutation_record",
        entityId: researchDecisionApprovalId
      });
    }
  }

  async insertSetupLifecycleMutationRecord(
    request: SetupLifecycleMutationRecordRecordWriteRequest
  ): Promise<SetupLifecycleMutationRecordDurableRecord> {
    const referenceContext: ReferenceContext = {
      entityId: request.record.identity.entityId,
      operation: "create",
      setupDefinitionId: request.record.setupDefinitionId,
      researchDecisionApprovalId: request.record.researchDecisionApprovalId,
      researchFeedbackDecisionId: request.record.researchFeedbackDecisionId
    };

    let validationError: RepositoryError | null;
    try {
      validationError = await findReferenceValidationError(this.prisma, referenceContext);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_lifecycle_mutation_record",
        entityId: request.record.identity.entityId
      });
    }
    if (validationError) {
      throw validationError;
    }

    try {
      const row = await this.prisma.setupLifecycleMutationRecordRecord.create({
        data: buildSetupLifecycleMutationCreateData(request.record)
      });
      return hydrateSetupLifecycleMutationRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_lifecycle_mutation_record",
        entityId: request.record.identity.entityId
      });
    }
  }
}
