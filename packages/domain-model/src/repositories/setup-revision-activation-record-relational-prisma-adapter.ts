import { Prisma } from "../generated/prisma/client.js";
import type { SetupRevisionActivationRecordDurableRecord } from "../storage/setup-revision-activation-record-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  SetupRevisionActivationRecordRecordWriteRequest,
  SetupRevisionActivationRecordRelationalRepositoryAdapter
} from "./setup-revision-activation-record-relational-repository-adapter.js";

type PrismaSetupRevisionActivationRecordModel =
  Prisma.SetupRevisionActivationRecordRecordGetPayload<object>;

type PrismaSetupRevisionActivationRecordDelegate = {
  create(args: {
    data: Prisma.SetupRevisionActivationRecordRecordUncheckedCreateInput;
  }): Promise<PrismaSetupRevisionActivationRecordModel>;
  findMany(args: {
    where:
      | {
          setupFamilyId: string;
        }
      | {
          targetRevisionId: string;
        };
    orderBy: {
      activatedAtUtc: "asc" | "desc";
    };
  }): Promise<PrismaSetupRevisionActivationRecordModel[]>;
  findUnique(args: {
    where: {
      setupRevisionActivationRecordId: string;
    };
  }): Promise<PrismaSetupRevisionActivationRecordModel | null>;
};

type PrismaSetupDefinitionReferenceDelegate = {
  findUnique(args: {
    where: {
      setupDefinitionId: string;
    };
  }): Promise<{ setupDefinitionId: string } | null>;
};

type PrismaSetupDefinitionRevisionReferenceDelegate = {
  findUnique(args: {
    where: {
      setupDefinitionRevisionId: string;
    };
  }): Promise<
    | {
        setupDefinitionRevisionId: string;
        setupDefinitionId: string;
        setupFamilyId: string;
      }
    | null
  >;
};

export type SetupRevisionActivationRecordRelationalPrismaClient = {
  setupRevisionActivationRecordRecord: PrismaSetupRevisionActivationRecordDelegate;
  setupDefinitionRecord: PrismaSetupDefinitionReferenceDelegate;
  setupDefinitionRevisionRecord: PrismaSetupDefinitionRevisionReferenceDelegate;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_reference";
  entityType: "setup_revision_activation_record";
  entityId?: string;
};

type ReferenceContext = {
  entityId: string;
  operation: "create";
  setupFamilyId: string;
  targetRevisionId: string;
  targetSetupDefinitionId: string;
  previousRevisionId: string | null;
  previousSetupDefinitionId: string | null;
};

type RevisionReference = {
  setupDefinitionRevisionId: string;
  setupDefinitionId: string;
  setupFamilyId: string;
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
  createdBySource: SetupRevisionActivationRecordDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SetupRevisionActivationRecordDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: Date | string | null;
  metadataNotes: string | null;
}): SetupRevisionActivationRecordDurableRecord["metadata"] => ({
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

const hydrateSetupRevisionActivationRecord = (
  row: PrismaSetupRevisionActivationRecordModel
): SetupRevisionActivationRecordDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_revision_activation_record",
    entityId: row.setupRevisionActivationRecordId,
    version: row.version,
    relatedEntityIds: dedupeRelatedEntityIds([
      row.setupFamilyId,
      row.targetRevisionId,
      row.targetSetupDefinitionId,
      row.previousRevisionId,
      row.previousSetupDefinitionId
    ])
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  setupFamilyId: row.setupFamilyId,
  targetRevisionId: row.targetRevisionId,
  targetSetupDefinitionId: row.targetSetupDefinitionId,
  previousRevisionId: row.previousRevisionId,
  previousSetupDefinitionId: row.previousSetupDefinitionId,
  activatedBy: row.activatedBy,
  activatedAtUtc: row.activatedAtUtc.toISOString(),
  activationOutcome:
    row.activationOutcome as SetupRevisionActivationRecordDurableRecord["activationOutcome"],
  rationale: row.rationale
});

const buildSetupRevisionActivationRecordCreateData = (
  record: SetupRevisionActivationRecordDurableRecord
): Prisma.SetupRevisionActivationRecordRecordUncheckedCreateInput => ({
  setupRevisionActivationRecordId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  setupFamilyId: record.setupFamilyId,
  targetRevisionId: record.targetRevisionId,
  targetSetupDefinitionId: record.targetSetupDefinitionId,
  previousRevisionId: record.previousRevisionId,
  previousSetupDefinitionId: record.previousSetupDefinitionId,
  activatedBy: record.activatedBy,
  activatedAtUtc: new Date(record.activatedAtUtc),
  activationOutcome: record.activationOutcome,
  rationale: record.rationale,
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

const loadRequiredRevisionReference = async (
  prisma: SetupRevisionActivationRecordRelationalPrismaClient,
  context: ReferenceContext,
  setupDefinitionRevisionId: string
): Promise<RevisionReference | RepositoryError> => {
  const revision = await prisma.setupDefinitionRevisionRecord.findUnique({
    where: { setupDefinitionRevisionId }
  });
  if (!revision) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: setupDefinitionRevisionId
    });
  }

  return revision;
};

const loadOptionalRevisionReference = async (
  prisma: SetupRevisionActivationRecordRelationalPrismaClient,
  context: ReferenceContext,
  setupDefinitionRevisionId: string | null
): Promise<RevisionReference | RepositoryError | null> => {
  if (!setupDefinitionRevisionId) {
    return null;
  }

  return loadRequiredRevisionReference(prisma, context, setupDefinitionRevisionId);
};

const assertSetupDefinitionReferenceExists = async (
  prisma: SetupRevisionActivationRecordRelationalPrismaClient,
  context: ReferenceContext,
  setupDefinitionId: string | null
): Promise<RepositoryError | null> => {
  if (!setupDefinitionId) {
    return null;
  }

  const setupDefinition = await prisma.setupDefinitionRecord.findUnique({
    where: { setupDefinitionId }
  });
  if (!setupDefinition) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition",
      referenceEntityId: setupDefinitionId
    });
  }

  return null;
};

const findReferenceValidationError = async (
  prisma: SetupRevisionActivationRecordRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError | null> => {
  const targetRevision = await loadRequiredRevisionReference(
    prisma,
    context,
    context.targetRevisionId
  );
  if (targetRevision instanceof RepositoryError) {
    return targetRevision;
  }

  const targetSetupReferenceError = await assertSetupDefinitionReferenceExists(
    prisma,
    context,
    context.targetSetupDefinitionId
  );
  if (targetSetupReferenceError) {
    return targetSetupReferenceError;
  }

  const previousRevision = await loadOptionalRevisionReference(
    prisma,
    context,
    context.previousRevisionId
  );
  if (previousRevision instanceof RepositoryError) {
    return previousRevision;
  }

  const previousSetupReferenceError = await assertSetupDefinitionReferenceExists(
    prisma,
    context,
    context.previousSetupDefinitionId
  );
  if (previousSetupReferenceError) {
    return previousSetupReferenceError;
  }

  if (
    context.previousRevisionId &&
    context.previousRevisionId === context.targetRevisionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: context.previousRevisionId
    });
  }

  if (
    context.previousSetupDefinitionId &&
    context.previousSetupDefinitionId === context.targetSetupDefinitionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition",
      referenceEntityId: context.previousSetupDefinitionId
    });
  }

  if (targetRevision.setupFamilyId !== context.setupFamilyId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: context.targetRevisionId
    });
  }

  if (targetRevision.setupDefinitionId !== context.targetSetupDefinitionId) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: context.targetRevisionId
    });
  }

  if (
    previousRevision &&
    previousRevision.setupFamilyId !== context.setupFamilyId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: previousRevision.setupDefinitionRevisionId
    });
  }

  if (
    previousRevision &&
    context.previousSetupDefinitionId &&
    previousRevision.setupDefinitionId !== context.previousSetupDefinitionId
  ) {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: previousRevision.setupDefinitionRevisionId
    });
  }

  return null;
};

const resolveInvalidReferenceRepositoryError = async (
  prisma: SetupRevisionActivationRecordRelationalPrismaClient,
  context: ReferenceContext
): Promise<RepositoryError> => {
  try {
    return (
      (await findReferenceValidationError(prisma, context)) ??
      createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: context.entityId,
        operation: context.operation,
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: context.targetRevisionId
      })
    );
  } catch {
    return createInvalidReferenceRepositoryError({
      entityType: "setup_revision_activation_record",
      entityId: context.entityId,
      operation: context.operation,
      referenceEntityType: "setup_definition_revision",
      referenceEntityId: context.targetRevisionId
    });
  }
};

export class PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter
  implements SetupRevisionActivationRecordRelationalRepositoryAdapter
{
  constructor(private readonly prisma: SetupRevisionActivationRecordRelationalPrismaClient) {}

  async loadSetupRevisionActivationRecord(
    setupRevisionActivationRecordId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord | null> {
    try {
      const row = await this.prisma.setupRevisionActivationRecordRecord.findUnique({
        where: { setupRevisionActivationRecordId }
      });
      return row ? hydrateSetupRevisionActivationRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "setup_revision_activation_record",
        entityId: setupRevisionActivationRecordId
      });
    }
  }

  async listSetupRevisionActivationRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord[]> {
    try {
      const rows = await this.prisma.setupRevisionActivationRecordRecord.findMany({
        where: { setupFamilyId },
        orderBy: { activatedAtUtc: "asc" }
      });
      return rows.map((row) => hydrateSetupRevisionActivationRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_revision_activation_record"
      });
    }
  }

  async listSetupRevisionActivationRecordsByTargetRevisionId(
    targetRevisionId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord[]> {
    try {
      const rows = await this.prisma.setupRevisionActivationRecordRecord.findMany({
        where: { targetRevisionId },
        orderBy: { activatedAtUtc: "asc" }
      });
      return rows.map((row) => hydrateSetupRevisionActivationRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_reference",
        entityType: "setup_revision_activation_record"
      });
    }
  }

  async insertSetupRevisionActivationRecord(
    request: SetupRevisionActivationRecordRecordWriteRequest
  ): Promise<SetupRevisionActivationRecordDurableRecord> {
    const entityId = request.record.identity.entityId;
    const referenceContext: ReferenceContext = {
      entityId,
      operation: "create",
      setupFamilyId: request.record.setupFamilyId,
      targetRevisionId: request.record.targetRevisionId,
      targetSetupDefinitionId: request.record.targetSetupDefinitionId,
      previousRevisionId: request.record.previousRevisionId,
      previousSetupDefinitionId: request.record.previousSetupDefinitionId
    };

    const referenceError = await findReferenceValidationError(
      this.prisma,
      referenceContext
    );
    if (referenceError) {
      throw referenceError;
    }

    try {
      const row = await this.prisma.setupRevisionActivationRecordRecord.create({
        data: buildSetupRevisionActivationRecordCreateData(request.record)
      });
      return hydrateSetupRevisionActivationRecord(row);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw await resolveInvalidReferenceRepositoryError(this.prisma, referenceContext);
      }

      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_revision_activation_record",
        entityId
      });
    }
  }
}
