import { Prisma } from "../generated/prisma/client.js";
import type { PatternNotificationRecord } from "../notification/pattern-notification-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError,
  RepositoryError
} from "./repository-error.js";
import { assertPatternNotificationEvidenceIsUnchanged } from "./pattern-notification-record-repository.js";
import type {
  PatternNotificationRecordCreateRequest,
  PatternNotificationRecordRepository,
  PatternNotificationRecordUpdateRequest
} from "./pattern-notification-record-repository.js";

type PrismaPatternNotificationRecord = Prisma.PatternNotificationRecordGetPayload<object>;

type PrismaPatternNotificationRecordDelegate = {
  create(args: {
    data: Prisma.PatternNotificationRecordUncheckedCreateInput;
  }): Promise<PrismaPatternNotificationRecord>;
  findMany(args: {
    where: { deliveryStatus: { in: PatternNotificationRecord["deliveryStatus"][] } };
    orderBy: { notificationId: "asc" };
    take: number;
  }): Promise<PrismaPatternNotificationRecord[]>;
  findUnique(args: {
    where: { notificationId?: string; deduplicationKey?: string };
  }): Promise<PrismaPatternNotificationRecord | null>;
  updateMany(args: {
    where: {
      notificationId: string;
      version: number;
      deliveryStatus?: PatternNotificationRecord["deliveryStatus"];
      deliveryAttemptedAtUtc?: Date;
    };
    data: Prisma.PatternNotificationRecordUncheckedUpdateManyInput;
  }): Promise<Prisma.BatchPayload>;
};

export type PatternNotificationRecordPrismaClient = {
  patternNotificationRecord: PrismaPatternNotificationRecordDelegate;
};

const toTimestampUtc = (value: Date | null): string | undefined => value?.toISOString();

const hydrate = (row: PrismaPatternNotificationRecord): PatternNotificationRecord => ({
  notificationId: row.notificationId,
  deduplicationKey: row.deduplicationKey,
  signalCandidateId: row.signalCandidateId,
  setupDefinitionId: row.setupDefinitionId,
  setupRevisionId: row.setupRevisionId,
  monitoredSymbolId: row.monitoredSymbolId,
  setupAggregateResultId: row.setupAggregateResultId,
  direction: "consider_long",
  observedAt: row.observedAtUtc.toISOString(),
  currentPrice: row.currentPrice,
  policyId: row.policyId,
  completedEvaluations: row.completedEvaluations,
  positiveOutcomeRate: row.positiveOutcomeRate,
  averagePercentageMove: row.averagePercentageMove,
  aggregateComputedAt: row.aggregateComputedAtUtc.toISOString(),
  deliveryStatus: row.deliveryStatus,
  ...(toTimestampUtc(row.deliveryAttemptedAtUtc)
    ? { deliveryAttemptedAt: toTimestampUtc(row.deliveryAttemptedAtUtc) }
    : {}),
  ...(toTimestampUtc(row.completedAtUtc) ? { completedAt: toTimestampUtc(row.completedAtUtc) } : {}),
  ...(row.outcomeCode ? { outcomeCode: row.outcomeCode } : {}),
  createdAtUtc: row.createdAtUtc.toISOString(),
  updatedAtUtc: row.updatedAtUtc.toISOString()
});

const buildData = (
  notification: PatternNotificationRecord,
  metadata: ProductRecordMetadata,
  version: number
): Prisma.PatternNotificationRecordUncheckedCreateInput => ({
  notificationId: notification.notificationId,
  version,
  lifecycleStatus: "active",
  deliveryStatus: notification.deliveryStatus,
  deduplicationKey: notification.deduplicationKey,
  signalCandidateId: notification.signalCandidateId,
  setupDefinitionId: notification.setupDefinitionId,
  setupRevisionId: notification.setupRevisionId,
  monitoredSymbolId: notification.monitoredSymbolId,
  setupAggregateResultId: notification.setupAggregateResultId,
  direction: notification.direction,
  observedAtUtc: new Date(notification.observedAt),
  currentPrice: notification.currentPrice,
  policyId: notification.policyId,
  completedEvaluations: notification.completedEvaluations,
  positiveOutcomeRate: notification.positiveOutcomeRate,
  averagePercentageMove: notification.averagePercentageMove,
  aggregateComputedAtUtc: new Date(notification.aggregateComputedAt),
  deliveryAttemptedAtUtc: notification.deliveryAttemptedAt
    ? new Date(notification.deliveryAttemptedAt)
    : null,
  completedAtUtc: notification.completedAt ? new Date(notification.completedAt) : null,
  outcomeCode: notification.outcomeCode ?? null,
  originRunId: metadata.originRunId,
  originTransitionId: metadata.originTransitionId,
  createdBySource: metadata.createdBySource,
  lastUpdatedBySource: metadata.lastUpdatedBySource,
  traceId: metadata.traceId,
  sourceObservedAtUtc: metadata.sourceObservedAtUtc
    ? new Date(metadata.sourceObservedAtUtc)
    : null,
  metadataNotes: metadata.notes ?? null,
  createdAtUtc: new Date(notification.createdAtUtc),
  updatedAtUtc: new Date(notification.updatedAtUtc),
  archivedAtUtc: null
});

const isPrismaErrorWithCode = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const mapError = (error: unknown, notificationId: string, operation: "create" | "update"): Error => {
  if (error instanceof RepositoryError) return error;
  if (isPrismaErrorWithCode(error) && error.code === "P2002") {
    return createAlreadyExistsRepositoryError({
      entityType: "pattern_notification",
      entityId: notificationId,
      operation
    });
  }
  return new RepositoryError(`unknown_failure persistence failure for pattern_notification`, {
    code: "unknown_failure",
    operation,
    entityType: "pattern_notification",
    entityId: notificationId,
    expectedVersion: null,
    retryDisposition: "retryable"
  });
};

export class PrismaPatternNotificationRecordRepository
  implements PatternNotificationRecordRepository
{
  constructor(private readonly prisma: PatternNotificationRecordPrismaClient) {}

  async getById(notificationId: string): Promise<PatternNotificationRecord | null> {
    const row = await this.prisma.patternNotificationRecord.findUnique({ where: { notificationId } });
    return row ? hydrate(row) : null;
  }

  async getByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationRecord | null> {
    const row = await this.prisma.patternNotificationRecord.findUnique({
      where: { deduplicationKey }
    });
    return row ? hydrate(row) : null;
  }

  async listByDeliveryStatus(
    statuses: PatternNotificationRecord["deliveryStatus"][],
    limit: number
  ): Promise<PatternNotificationRecord[]> {
    const rows = await this.prisma.patternNotificationRecord.findMany({
      where: { deliveryStatus: { in: statuses } },
      orderBy: { notificationId: "asc" },
      take: limit
    });
    return rows.map(hydrate);
  }

  async create(
    request: PatternNotificationRecordCreateRequest
  ): Promise<PatternNotificationRecord> {
    try {
      const row = await this.prisma.patternNotificationRecord.create({
        data: buildData(request.notification, request.metadata, 1)
      });
      return hydrate(row);
    } catch (error) {
      throw mapError(error, request.notification.notificationId, "create");
    }
  }

  async update(
    request: PatternNotificationRecordUpdateRequest
  ): Promise<PatternNotificationRecord> {
    const notificationId = request.notification.notificationId;
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
      assertPatternNotificationEvidenceIsUnchanged(hydrate(current), request.notification);
      const expectedVersion = request.expectedVersion ?? current.version;
      const result = await this.prisma.patternNotificationRecord.updateMany({
        where: {
          notificationId,
          version: expectedVersion,
          ...(request.expectedDeliveryStatus
            ? { deliveryStatus: request.expectedDeliveryStatus }
            : {}),
          ...(request.expectedDeliveryAttemptedAt
            ? { deliveryAttemptedAtUtc: new Date(request.expectedDeliveryAttemptedAt) }
            : {})
        },
        data: buildData(request.notification, request.metadata, current.version + 1)
      });
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
      if (result.count === 0) {
        throw createVersionMismatchRepositoryError({
          entityType: "pattern_notification",
          entityId: notificationId,
          operation: "update",
          expectedVersion,
          actualVersion: row.version
        });
      }
      return hydrate(row);
    } catch (error) {
      throw mapError(error, notificationId, "update");
    }
  }
}
