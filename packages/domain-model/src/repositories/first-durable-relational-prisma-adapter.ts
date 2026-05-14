import type {
  ResearchHypothesisDurableRecord,
  ResearchHypothesisSetupDefinitionLinkRecord,
  SetupDefinitionDurableRecord
} from "../storage/first-durable-relational-slice.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import type {
  FirstDurableRelationalRepositoryAdapter,
  ResearchHypothesisBundleWriteRequest,
  ResearchHypothesisDurableRecordBundle,
  SetupDefinitionRecordWriteRequest
} from "./first-durable-relational-repository-adapter.js";

type PrismaSetupDefinitionRecordModel = Prisma.SetupDefinitionRecordGetPayload<object>;
type PrismaResearchHypothesisRecordModel = Prisma.ResearchHypothesisRecordGetPayload<object>;
type PrismaResearchHypothesisBundleModel = Prisma.ResearchHypothesisRecordGetPayload<{
  include: { setupDefinitionLinks: true };
}>;

type PrismaSetupDefinitionDelegate = {
  create(args: {
    data: Prisma.SetupDefinitionRecordUncheckedCreateInput;
  }): Promise<PrismaSetupDefinitionRecordModel>;
  findMany(args: {
    where: {
      definitionStatus: {
        in: SetupDefinitionDurableRecord["definitionStatus"][];
      };
    };
    orderBy: {
      setupDefinitionId: "asc" | "desc";
    };
  }): Promise<PrismaSetupDefinitionRecordModel[]>;
  findUnique(args: {
    where: {
      setupDefinitionId: string;
    };
  }): Promise<PrismaSetupDefinitionRecordModel | null>;
  updateMany(args: {
    where: {
      setupDefinitionId: string;
      version?: number;
    };
    data: Prisma.SetupDefinitionRecordUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload>;
};

type PrismaResearchHypothesisDelegate = {
  create(args: {
    data: Prisma.ResearchHypothesisRecordUncheckedCreateInput;
  }): Promise<PrismaResearchHypothesisRecordModel>;
  findMany(args: {
    where: {
      hypothesisStatus: {
        in: ResearchHypothesisDurableRecord["hypothesisStatus"][];
      };
    };
    include: {
      setupDefinitionLinks: {
        orderBy: {
          setupDefinitionId: "asc" | "desc";
        };
      };
    };
    orderBy: {
      researchHypothesisId: "asc" | "desc";
    };
  }): Promise<PrismaResearchHypothesisBundleModel[]>;
  findUnique(args: {
    where: {
      researchHypothesisId: string;
    };
    include: {
      setupDefinitionLinks: {
        orderBy: {
          setupDefinitionId: "asc" | "desc";
        };
      };
    };
  }): Promise<PrismaResearchHypothesisBundleModel | null>;
  updateMany(args: {
    where: {
      researchHypothesisId: string;
      version?: number;
    };
    data: Prisma.ResearchHypothesisRecordUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload>;
};

type PrismaResearchHypothesisLinkDelegate = {
  createMany(args: {
    data: Prisma.ResearchHypothesisSetupDefinitionLinkRecordCreateManyInput[];
  }): Promise<Prisma.BatchPayload>;
  deleteMany(args: {
    where: {
      researchHypothesisId: string;
    };
  }): Promise<Prisma.BatchPayload>;
};

export type FirstDurableRelationalPrismaTransactionClient = {
  setupDefinitionRecord: PrismaSetupDefinitionDelegate;
  researchHypothesisRecord: PrismaResearchHypothesisDelegate;
  researchHypothesisSetupDefinitionLinkRecord: PrismaResearchHypothesisLinkDelegate;
};

export type FirstDurableRelationalPrismaClient = FirstDurableRelationalPrismaTransactionClient & {
  $transaction<T>(
    callback: (transaction: FirstDurableRelationalPrismaTransactionClient) => Promise<T>
  ): Promise<T>;
};

type ErrorContext = {
  operation: "create" | "get_by_id" | "list_by_status" | "update";
  entityType: "setup_definition" | "research_hypothesis";
  entityId?: string;
  expectedVersion?: number | null;
  referenceEntityId?: string | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P2024", "P2034", "P2037"]);

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const mapPrismaErrorToRepositoryError = (error: unknown, context: ErrorContext): RepositoryError => {
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

    if (error.code === "P2003") {
      return new RepositoryError(
        `invalid setup_definition reference for ${context.entityType}: ${context.referenceEntityId ?? "unknown"}`,
        {
          code: "invalid_reference",
          operation: context.operation,
          entityType: context.entityType,
          entityId: context.entityId ?? null,
          referenceEntityType: "setup_definition",
          referenceEntityId: context.referenceEntityId ?? null,
          retryDisposition: "do_not_retry"
        }
      );
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
  createdBySource: SetupDefinitionDurableRecord["metadata"]["createdBySource"];
  lastUpdatedBySource: SetupDefinitionDurableRecord["metadata"]["lastUpdatedBySource"];
  traceId: string | null;
  sourceObservedAtUtc: string | Date | null;
  metadataNotes: string | null;
}): SetupDefinitionDurableRecord["metadata"] => ({
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

const hydrateSetupDefinitionRecord = (
  row: PrismaSetupDefinitionRecordModel
): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: row.setupDefinitionId,
    version: row.version,
    relatedEntityIds: []
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
  metadata: buildMetadata(row),
  definitionStatus: row.definitionStatus,
  name: row.name,
  description: row.description,
  measurableConditions: [...row.measurableConditions],
  evaluationAssumptions: [...row.evaluationAssumptions],
  invalidationAssumptions: [...row.invalidationAssumptions],
  traceMetadata:
    row.traceOriginRunId || row.traceOriginTransitionId || row.traceMetadataTraceId
      ? {
          originRunId: row.traceOriginRunId,
          originTransitionId: row.traceOriginTransitionId,
          traceId: row.traceMetadataTraceId
        }
      : null
});

const hydrateResearchHypothesisBundle = (
  row: PrismaResearchHypothesisBundleModel
): ResearchHypothesisDurableRecordBundle => ({
  hypothesisRecord: {
    storageSchemaVersion: "product_domain.relational.v1",
    identity: {
      boundary: "product_domain",
      entityType: "research_hypothesis",
      entityId: row.researchHypothesisId,
      version: row.version,
      relatedEntityIds: row.setupDefinitionLinks.map((link) => link.setupDefinitionId)
    },
    lifecycleStatus: row.lifecycleStatus,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
    archivedAtUtc: toTimestampUtc(row.archivedAtUtc),
    metadata: buildMetadata(row),
    hypothesisStatus: row.hypothesisStatus,
    title: row.title,
    description: row.description,
    assumptions: [...row.assumptions],
    notes: [...row.notes],
    evidenceStatus: row.evidenceStatus,
    evidenceSummary: row.evidenceSummary,
    lastEvidenceAggregateResultId: row.lastEvidenceAggregateResultId,
    lastEvidenceAssessedAt: toTimestampUtc(row.lastEvidenceAssessedAt)
  },
  setupDefinitionLinkRecords: row.setupDefinitionLinks
    .slice()
    .sort((left, right) => left.setupDefinitionId.localeCompare(right.setupDefinitionId))
    .map(
      (link): ResearchHypothesisSetupDefinitionLinkRecord => ({
        storageSchemaVersion: "product_domain.relational.v1",
        researchHypothesisId: link.researchHypothesisId,
        setupDefinitionId: link.setupDefinitionId,
        linkedAtUtc: link.linkedAtUtc.toISOString()
      })
    )
});

const buildSetupDefinitionCreateData = (
  record: SetupDefinitionDurableRecord
): Prisma.SetupDefinitionRecordUncheckedCreateInput => ({
  setupDefinitionId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  definitionStatus: record.definitionStatus,
  name: record.name,
  description: record.description,
  measurableConditions: record.measurableConditions,
  evaluationAssumptions: record.evaluationAssumptions,
  invalidationAssumptions: record.invalidationAssumptions,
  originRunId: record.metadata.originRunId,
  originTransitionId: record.metadata.originTransitionId,
  createdBySource: record.metadata.createdBySource,
  lastUpdatedBySource: record.metadata.lastUpdatedBySource,
  traceId: record.metadata.traceId,
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  traceOriginRunId: record.traceMetadata?.originRunId ?? null,
  traceOriginTransitionId: record.traceMetadata?.originTransitionId ?? null,
  traceMetadataTraceId: record.traceMetadata?.traceId ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const buildSetupDefinitionUpdateData = (
  record: SetupDefinitionDurableRecord
): Prisma.SetupDefinitionRecordUpdateManyMutationInput => ({
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  definitionStatus: record.definitionStatus,
  name: record.name,
  description: record.description,
  measurableConditions: { set: record.measurableConditions },
  evaluationAssumptions: { set: record.evaluationAssumptions },
  invalidationAssumptions: { set: record.invalidationAssumptions },
  originRunId: record.metadata.originRunId,
  originTransitionId: record.metadata.originTransitionId,
  createdBySource: record.metadata.createdBySource,
  lastUpdatedBySource: record.metadata.lastUpdatedBySource,
  traceId: record.metadata.traceId,
  sourceObservedAtUtc: record.metadata.sourceObservedAtUtc ? new Date(record.metadata.sourceObservedAtUtc) : null,
  metadataNotes: record.metadata.notes ?? null,
  traceOriginRunId: record.traceMetadata?.originRunId ?? null,
  traceOriginTransitionId: record.traceMetadata?.originTransitionId ?? null,
  traceMetadataTraceId: record.traceMetadata?.traceId ?? null,
  createdAtUtc: new Date(record.createdAtUtc),
  updatedAtUtc: new Date(record.updatedAtUtc),
  archivedAtUtc: record.archivedAtUtc ? new Date(record.archivedAtUtc) : null
});

const buildResearchHypothesisCreateData = (
  record: ResearchHypothesisDurableRecord
): Prisma.ResearchHypothesisRecordUncheckedCreateInput => ({
  researchHypothesisId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  hypothesisStatus: record.hypothesisStatus,
  title: record.title,
  description: record.description,
  assumptions: record.assumptions,
  notes: record.notes,
  evidenceStatus: record.evidenceStatus,
  evidenceSummary: record.evidenceSummary,
  lastEvidenceAggregateResultId: record.lastEvidenceAggregateResultId,
  lastEvidenceAssessedAt: record.lastEvidenceAssessedAt ? new Date(record.lastEvidenceAssessedAt) : null,
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

const buildResearchHypothesisUpdateData = (
  record: ResearchHypothesisDurableRecord
): Prisma.ResearchHypothesisRecordUpdateManyMutationInput => ({
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  hypothesisStatus: record.hypothesisStatus,
  title: record.title,
  description: record.description,
  assumptions: { set: record.assumptions },
  notes: { set: record.notes },
  evidenceStatus: record.evidenceStatus,
  evidenceSummary: record.evidenceSummary,
  lastEvidenceAggregateResultId: record.lastEvidenceAggregateResultId,
  lastEvidenceAssessedAt: record.lastEvidenceAssessedAt ? new Date(record.lastEvidenceAssessedAt) : null,
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

const buildResearchHypothesisLinkRows = (
  bundle: ResearchHypothesisDurableRecordBundle
): Prisma.ResearchHypothesisSetupDefinitionLinkRecordCreateManyInput[] =>
  bundle.setupDefinitionLinkRecords.map((linkRecord) => ({
    researchHypothesisId: linkRecord.researchHypothesisId,
    setupDefinitionId: linkRecord.setupDefinitionId,
    linkedAtUtc: new Date(linkRecord.linkedAtUtc)
  }));

const loadResearchHypothesisBundle = async (
  client: FirstDurableRelationalPrismaTransactionClient,
  researchHypothesisId: string
): Promise<ResearchHypothesisDurableRecordBundle | null> => {
  const row = await client.researchHypothesisRecord.findUnique({
    where: { researchHypothesisId },
    include: {
      setupDefinitionLinks: {
        orderBy: { setupDefinitionId: "asc" }
      }
    }
  });
  return row ? hydrateResearchHypothesisBundle(row) : null;
};

export class PrismaFirstDurableRelationalRepositoryAdapter
  implements FirstDurableRelationalRepositoryAdapter
{
  constructor(private readonly prisma: FirstDurableRelationalPrismaClient) {}

  async loadSetupDefinitionRecord(
    setupDefinitionId: string
  ): Promise<SetupDefinitionDurableRecord | null> {
    try {
      const row = await this.prisma.setupDefinitionRecord.findUnique({
        where: { setupDefinitionId }
      });
      return row ? hydrateSetupDefinitionRecord(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "setup_definition",
        entityId: setupDefinitionId
      });
    }
  }

  async listSetupDefinitionRecordsByStatus(
    statuses: SetupDefinitionDurableRecord["definitionStatus"][]
  ): Promise<SetupDefinitionDurableRecord[]> {
    try {
      const rows = await this.prisma.setupDefinitionRecord.findMany({
        where: {
          definitionStatus: {
            in: statuses
          }
        },
        orderBy: { setupDefinitionId: "asc" }
      });
      return rows.map((row) => hydrateSetupDefinitionRecord(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_status",
        entityType: "setup_definition"
      });
    }
  }

  async insertSetupDefinitionRecord(
    request: SetupDefinitionRecordWriteRequest
  ): Promise<SetupDefinitionDurableRecord> {
    try {
      const row = await this.prisma.setupDefinitionRecord.create({
        data: buildSetupDefinitionCreateData(request.record)
      });
      return hydrateSetupDefinitionRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "setup_definition",
        entityId: request.record.identity.entityId
      });
    }
  }

  async updateSetupDefinitionRecord(
    request: SetupDefinitionRecordWriteRequest
  ): Promise<SetupDefinitionDurableRecord> {
    const setupDefinitionId = request.record.identity.entityId;

    try {
      const updated = await this.prisma.setupDefinitionRecord.updateMany({
        where: {
          setupDefinitionId,
          ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
        },
        data: buildSetupDefinitionUpdateData(request.record)
      });

      if (updated.count === 0) {
        const current = await this.prisma.setupDefinitionRecord.findUnique({
          where: { setupDefinitionId }
        });
        if (!current) {
          throw createNotFoundRepositoryError({
            entityType: "setup_definition",
            entityId: setupDefinitionId,
            operation: "update"
          });
        }

        if (request.expectedVersion !== null) {
          throw createVersionMismatchRepositoryError({
            entityType: "setup_definition",
            entityId: setupDefinitionId,
            operation: "update",
            expectedVersion: request.expectedVersion,
            actualVersion: current.version
          });
        }

        throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
          operation: "update",
          entityType: "setup_definition",
          entityId: setupDefinitionId
        });
      }

      const row = await this.prisma.setupDefinitionRecord.findUnique({
        where: { setupDefinitionId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "setup_definition",
          entityId: setupDefinitionId,
          operation: "update"
        });
      }

      return hydrateSetupDefinitionRecord(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "setup_definition",
        entityId: setupDefinitionId,
        expectedVersion: request.expectedVersion
      });
    }
  }

  async loadResearchHypothesisBundle(
    researchHypothesisId: string
  ): Promise<ResearchHypothesisDurableRecordBundle | null> {
    try {
      return await loadResearchHypothesisBundle(this.prisma, researchHypothesisId);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityType: "research_hypothesis",
        entityId: researchHypothesisId
      });
    }
  }

  async listResearchHypothesisBundlesByStatus(
    statuses: ResearchHypothesisDurableRecord["hypothesisStatus"][]
  ): Promise<ResearchHypothesisDurableRecordBundle[]> {
    try {
      const rows = await this.prisma.researchHypothesisRecord.findMany({
        where: {
          hypothesisStatus: {
            in: statuses
          }
        },
        include: {
          setupDefinitionLinks: {
            orderBy: { setupDefinitionId: "asc" }
          }
        },
        orderBy: { researchHypothesisId: "asc" }
      });
      return rows.map((row) => hydrateResearchHypothesisBundle(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "list_by_status",
        entityType: "research_hypothesis"
      });
    }
  }

  async insertResearchHypothesisBundle(
    request: ResearchHypothesisBundleWriteRequest
  ): Promise<ResearchHypothesisDurableRecordBundle> {
    const entityId = request.bundle.hypothesisRecord.identity.entityId;
    const firstReferenceId = request.bundle.setupDefinitionLinkRecords[0]?.setupDefinitionId ?? null;

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.researchHypothesisRecord.create({
          data: buildResearchHypothesisCreateData(request.bundle.hypothesisRecord)
        });

        if (request.bundle.setupDefinitionLinkRecords.length > 0) {
          await transaction.researchHypothesisSetupDefinitionLinkRecord.createMany({
            data: buildResearchHypothesisLinkRows(request.bundle)
          });
        }

        const bundle = await loadResearchHypothesisBundle(transaction, entityId);
        if (!bundle) {
          throw createNotFoundRepositoryError({
            entityType: "research_hypothesis",
            entityId,
            operation: "create"
          });
        }
        return bundle;
      });
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityType: "research_hypothesis",
        entityId,
        referenceEntityId: firstReferenceId
      });
    }
  }

  async updateResearchHypothesisBundle(
    request: ResearchHypothesisBundleWriteRequest
  ): Promise<ResearchHypothesisDurableRecordBundle> {
    const entityId = request.bundle.hypothesisRecord.identity.entityId;
    const firstReferenceId = request.bundle.setupDefinitionLinkRecords[0]?.setupDefinitionId ?? null;

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.researchHypothesisRecord.updateMany({
          where: {
            researchHypothesisId: entityId,
            ...(request.expectedVersion !== null ? { version: request.expectedVersion } : {})
          },
          data: buildResearchHypothesisUpdateData(request.bundle.hypothesisRecord)
        });

        if (updated.count === 0) {
          const current = await transaction.researchHypothesisRecord.findUnique({
            where: { researchHypothesisId: entityId },
            include: {
              setupDefinitionLinks: {
                orderBy: { setupDefinitionId: "asc" }
              }
            }
          });
          if (!current) {
            throw createNotFoundRepositoryError({
              entityType: "research_hypothesis",
              entityId,
              operation: "update"
            });
          }

          if (request.expectedVersion !== null) {
            throw createVersionMismatchRepositoryError({
              entityType: "research_hypothesis",
              entityId,
              operation: "update",
              expectedVersion: request.expectedVersion,
              actualVersion: current.version
            });
          }

          throw mapPrismaErrorToRepositoryError(new Error("unexpected update miss"), {
            operation: "update",
            entityType: "research_hypothesis",
            entityId
          });
        }

        await transaction.researchHypothesisSetupDefinitionLinkRecord.deleteMany({
          where: { researchHypothesisId: entityId }
        });

        if (request.bundle.setupDefinitionLinkRecords.length > 0) {
          await transaction.researchHypothesisSetupDefinitionLinkRecord.createMany({
            data: buildResearchHypothesisLinkRows(request.bundle)
          });
        }

        const bundle = await loadResearchHypothesisBundle(transaction, entityId);
        if (!bundle) {
          throw createNotFoundRepositoryError({
            entityType: "research_hypothesis",
            entityId,
            operation: "update"
          });
        }
        return bundle;
      });
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityType: "research_hypothesis",
        entityId,
        expectedVersion: request.expectedVersion,
        referenceEntityId: firstReferenceId
      });
    }
  }
}
