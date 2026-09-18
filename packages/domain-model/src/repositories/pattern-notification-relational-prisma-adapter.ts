import { Prisma } from "../generated/prisma/client.js";
import type { PatternNotificationDurableRecord } from "../storage/pattern-notification-relational-slice.js";
import type {
  PatternNotificationDeliveryStatusQuery,
  PatternNotificationInsertRequest,
  PatternNotificationReferenceKind,
  PatternNotificationRelationalRepositoryAdapter,
  PatternNotificationUpdateRequest
} from "./pattern-notification-relational-repository-adapter.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError,
  type RepositoryOperation
} from "./repository-error.js";

type PrismaPatternNotificationRow = Prisma.PatternNotificationRecordGetPayload<object>;

type ExistenceDelegate = {
  findUnique(args: {
    where: Record<string, string>;
    select: Record<string, true>;
  }): Promise<unknown | null>;
};

export type PatternNotificationRelationalPrismaClient = {
  patternNotificationRecord: {
    create(args: {
      data: Prisma.PatternNotificationRecordUncheckedCreateInput;
    }): Promise<PrismaPatternNotificationRow>;
    findUnique(args: {
      where: { notificationId?: string; deduplicationKey?: string };
    }): Promise<PrismaPatternNotificationRow | null>;
    findMany(args: {
      where: {
        deliveryStatus: { in: PatternNotificationDurableRecord["deliveryStatus"][] };
      };
      orderBy: { observedAtUtc: "asc" };
      take: number;
    }): Promise<PrismaPatternNotificationRow[]>;
    updateMany(args: {
      where: {
        notificationId: string;
        version: number;
        deliveryStatus?: PatternNotificationDurableRecord["deliveryStatus"];
        deliveryAttemptedAtUtc?: Date;
      };
      data: Prisma.PatternNotificationRecordUncheckedUpdateManyInput;
    }): Promise<Prisma.BatchPayload>;
  };
  signalCandidateRecord: ExistenceDelegate;
  setupDefinitionRecord: ExistenceDelegate;
  setupDefinitionRevisionRecord: ExistenceDelegate;
  monitoredSymbolRecord: ExistenceDelegate;
  setupAggregateResultRecord: ExistenceDelegate;
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

type ErrorContext = {
  operation: RepositoryOperation;
  entityId?: string | null;
};

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
        entityType: "pattern_notification",
        entityId: context.entityId ?? "unknown",
        operation: context.operation
      });
    }

    if (TRANSIENT_PRISMA_ERROR_CODES.has(error.code)) {
      return new RepositoryError("transient persistence failure for pattern_notification", {
        code: "transient_failure",
        operation: context.operation,
        entityType: "pattern_notification",
        entityId: context.entityId ?? null,
        retryDisposition: "retryable"
      });
    }
  }

  return new RepositoryError("unknown persistence failure for pattern_notification", {
    code: "unknown_failure",
    operation: context.operation,
    entityType: "pattern_notification",
    entityId: context.entityId ?? null,
    retryDisposition: "retryable"
  });
};

const hydrateRow = (row: PrismaPatternNotificationRow): PatternNotificationDurableRecord => ({
  storageSchemaVersion: "product_domain.relational.v1",
  identity: {
    boundary: "product_domain",
    entityType: "pattern_notification",
    entityId: row.notificationId,
    version: row.version,
    relatedEntityIds: [
      row.signalCandidateId,
      row.setupDefinitionId,
      row.setupRevisionId,
      row.monitoredSymbolId,
      row.setupAggregateResultId
    ]
  },
  lifecycleStatus: row.lifecycleStatus,
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString(),
  archivedAtUtc: row.archivedAtUtc?.toISOString() ?? null,
  metadata: {
    originRunId: row.originRunId,
    originTransitionId: row.originTransitionId,
    createdBySource: row.createdBySource,
    lastUpdatedBySource: row.lastUpdatedBySource,
    traceId: row.traceId,
    sourceObservedAtUtc: row.sourceObservedAtUtc?.toISOString() ?? null,
    ...(row.metadataNotes ? { notes: row.metadataNotes } : {})
  },
  deduplicationKey: row.deduplicationKey,
  signalCandidateId: row.signalCandidateId,
  setupDefinitionId: row.setupDefinitionId,
  setupRevisionId: row.setupRevisionId,
  monitoredSymbolId: row.monitoredSymbolId,
  setupAggregateResultId: row.setupAggregateResultId,
  direction: "consider_long",
  observedAtUtc: row.observedAtUtc.toISOString(),
  currentPrice: row.currentPrice,
  policyId: row.policyId,
  completedEvaluations: row.completedEvaluations,
  positiveOutcomeRate: row.positiveOutcomeRate,
  averagePercentageMove: row.averagePercentageMove,
  aggregateComputedAtUtc: row.aggregateComputedAtUtc.toISOString(),
  deliveryStatus: row.deliveryStatus,
  deliveryAttemptedAtUtc: row.deliveryAttemptedAtUtc?.toISOString() ?? null,
  deliveryLeaseId: row.deliveryLeaseId,
  deliveryLeaseExpiresAtUtc: row.deliveryLeaseExpiresAtUtc?.toISOString() ?? null,
  completedAtUtc: row.completedAtUtc?.toISOString() ?? null,
  outcomeCode: row.outcomeCode
});

const buildData = (
  record: PatternNotificationDurableRecord
): Prisma.PatternNotificationRecordUncheckedCreateInput => ({
  notificationId: record.identity.entityId,
  version: record.identity.version,
  lifecycleStatus: record.lifecycleStatus,
  deliveryStatus: record.deliveryStatus,
  deduplicationKey: record.deduplicationKey,
  signalCandidateId: record.signalCandidateId,
  setupDefinitionId: record.setupDefinitionId,
  setupRevisionId: record.setupRevisionId,
  monitoredSymbolId: record.monitoredSymbolId,
  setupAggregateResultId: record.setupAggregateResultId,
  direction: record.direction,
  observedAtUtc: new Date(record.observedAtUtc),
  currentPrice: record.currentPrice,
  policyId: record.policyId,
  completedEvaluations: record.completedEvaluations,
  positiveOutcomeRate: record.positiveOutcomeRate,
  averagePercentageMove: record.averagePercentageMove,
  aggregateComputedAtUtc: new Date(record.aggregateComputedAtUtc),
  deliveryAttemptedAtUtc: record.deliveryAttemptedAtUtc
    ? new Date(record.deliveryAttemptedAtUtc)
    : null,
  deliveryLeaseId: record.deliveryLeaseId,
  deliveryLeaseExpiresAtUtc: record.deliveryLeaseExpiresAtUtc
    ? new Date(record.deliveryLeaseExpiresAtUtc)
    : null,
  completedAtUtc: record.completedAtUtc ? new Date(record.completedAtUtc) : null,
  outcomeCode: record.outcomeCode,
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

export class PrismaPatternNotificationRelationalRepositoryAdapter
  implements PatternNotificationRelationalRepositoryAdapter
{
  constructor(private readonly prisma: PatternNotificationRelationalPrismaClient) {}

  async loadPatternNotification(
    notificationId: string
  ): Promise<PatternNotificationDurableRecord | null> {
    try {
      const row = await this.prisma.patternNotificationRecord.findUnique({
        where: { notificationId }
      });
      return row ? hydrateRow(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_id",
        entityId: notificationId
      });
    }
  }

  async loadPatternNotificationByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationDurableRecord | null> {
    try {
      const row = await this.prisma.patternNotificationRecord.findUnique({
        where: { deduplicationKey }
      });
      return row ? hydrateRow(row) : null;
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "get_by_reference",
        entityId: deduplicationKey
      });
    }
  }

  async listPatternNotificationsByDeliveryStatus(
    query: PatternNotificationDeliveryStatusQuery
  ): Promise<PatternNotificationDurableRecord[]> {
    try {
      const rows = await this.prisma.patternNotificationRecord.findMany({
        where: { deliveryStatus: { in: query.statuses } },
        orderBy: { observedAtUtc: "asc" },
        take: query.limit
      });
      return rows.map((row) => hydrateRow(row));
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, { operation: "list_by_status" });
    }
  }

  async insertPatternNotification(
    request: PatternNotificationInsertRequest
  ): Promise<PatternNotificationDurableRecord> {
    const notificationId = request.record.identity.entityId;
    try {
      await this.assertReferencesExist(request.record);
      const row = await this.prisma.patternNotificationRecord.create({
        data: buildData(request.record)
      });
      return hydrateRow(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "create",
        entityId: notificationId
      });
    }
  }

  async updatePatternNotification(
    request: PatternNotificationUpdateRequest
  ): Promise<PatternNotificationDurableRecord> {
    const notificationId = request.record.identity.entityId;
    try {
      const current = await this.prisma.patternNotificationRecord.findUnique({
        where: { notificationId }
      });
      if (!current) {
        throw createNotFoundRepositoryError({
          entityType: "pattern_notification",
          entityId: notificationId,
          operation: "update"
        });
      }

      const expectedVersion = request.expectedVersion ?? current.version;
      const result = await this.prisma.patternNotificationRecord.updateMany({
        where: {
          notificationId,
          version: expectedVersion,
          ...(request.expectedDeliveryStatus
            ? { deliveryStatus: request.expectedDeliveryStatus }
            : {}),
          ...(request.expectedDeliveryAttemptedAtUtc
            ? { deliveryAttemptedAtUtc: new Date(request.expectedDeliveryAttemptedAtUtc) }
            : {})
        },
        data: buildData(request.record)
      });

      if (result.count === 0) {
        throw createVersionMismatchRepositoryError({
          entityType: "pattern_notification",
          entityId: notificationId,
          operation: "update",
          expectedVersion,
          actualVersion: current.version
        });
      }

      const row = await this.prisma.patternNotificationRecord.findUnique({
        where: { notificationId }
      });
      if (!row) {
        throw createNotFoundRepositoryError({
          entityType: "pattern_notification",
          entityId: notificationId,
          operation: "update"
        });
      }

      return hydrateRow(row);
    } catch (error) {
      throw mapPrismaErrorToRepositoryError(error, {
        operation: "update",
        entityId: notificationId
      });
    }
  }

  /**
   * `pattern_notification` carries no foreign keys, unlike its peers, so Postgres will not raise
   * P2003 for a dangling reference. Check explicitly instead, otherwise this adapter would accept
   * evidence the in-memory adapter rejects.
   */
  private async assertReferencesExist(
    record: PatternNotificationDurableRecord
  ): Promise<void> {
    const checks: [PatternNotificationReferenceKind, string, ExistenceDelegate, string][] = [
      [
        "signal_candidate",
        record.signalCandidateId,
        this.prisma.signalCandidateRecord,
        "signalCandidateId"
      ],
      [
        "setup_definition",
        record.setupDefinitionId,
        this.prisma.setupDefinitionRecord,
        "setupDefinitionId"
      ],
      [
        "setup_definition_revision",
        record.setupRevisionId,
        this.prisma.setupDefinitionRevisionRecord,
        "setupDefinitionRevisionId"
      ],
      [
        "monitored_symbol",
        record.monitoredSymbolId,
        this.prisma.monitoredSymbolRecord,
        "monitoredSymbolId"
      ],
      [
        "setup_aggregate_result",
        record.setupAggregateResultId,
        this.prisma.setupAggregateResultRecord,
        "setupAggregateResultId"
      ]
    ];

    for (const [referenceEntityType, referenceEntityId, delegate, idField] of checks) {
      const found = await delegate.findUnique({
        where: { [idField]: referenceEntityId },
        select: { [idField]: true }
      });

      if (found) {
        continue;
      }

      throw createInvalidReferenceRepositoryError({
        entityType: "pattern_notification",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType,
        referenceEntityId
      });
    }
  }
}
