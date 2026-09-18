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
  createVersionMismatchRepositoryError
} from "./repository-error.js";

/**
 * The adapter only needs to know that each referenced record exists, never its contents, so the
 * port asks exactly that. A Prisma implementation can answer it with an existence query instead of
 * loading five full rows on every insert.
 */
export type PatternNotificationRelationalReferenceReader = {
  referenceExists(kind: PatternNotificationReferenceKind, entityId: string): Promise<boolean>;
};

const clonePatternNotification = (
  record: PatternNotificationDurableRecord
): PatternNotificationDurableRecord => structuredClone(record);

export class InMemoryPatternNotificationRelationalRepositoryAdapter
  implements PatternNotificationRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, PatternNotificationDurableRecord>();

  constructor(private readonly references: PatternNotificationRelationalReferenceReader) {}

  async loadPatternNotification(
    notificationId: string
  ): Promise<PatternNotificationDurableRecord | null> {
    const record = this.recordsById.get(notificationId);
    return record ? clonePatternNotification(record) : null;
  }

  async loadPatternNotificationByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationDurableRecord | null> {
    const record = [...this.recordsById.values()].find(
      (candidate) => candidate.deduplicationKey === deduplicationKey
    );
    return record ? clonePatternNotification(record) : null;
  }

  async listPatternNotificationsByDeliveryStatus(
    query: PatternNotificationDeliveryStatusQuery
  ): Promise<PatternNotificationDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => query.statuses.includes(record.deliveryStatus))
      .sort((left, right) => left.observedAtUtc.localeCompare(right.observedAtUtc))
      .slice(0, Math.max(query.limit, 0))
      .map((record) => clonePatternNotification(record));
  }

  async insertPatternNotification(
    request: PatternNotificationInsertRequest
  ): Promise<PatternNotificationDurableRecord> {
    const notificationId = request.record.identity.entityId;
    if (this.recordsById.has(notificationId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "pattern_notification",
        entityId: notificationId,
        operation: "create"
      });
    }

    // Mirrors the pattern_notification_deduplication_key unique constraint: one candidate can
    // produce at most one retained alert.
    const duplicate = await this.loadPatternNotificationByDeduplicationKey(
      request.record.deduplicationKey
    );
    if (duplicate) {
      throw createAlreadyExistsRepositoryError({
        entityType: "pattern_notification",
        entityId: request.record.deduplicationKey,
        operation: "create"
      });
    }

    await this.assertReferencesExist(request.record);

    this.recordsById.set(notificationId, clonePatternNotification(request.record));
    return clonePatternNotification(request.record);
  }

  async updatePatternNotification(
    request: PatternNotificationUpdateRequest
  ): Promise<PatternNotificationDurableRecord> {
    const notificationId = request.record.identity.entityId;
    const existing = this.recordsById.get(notificationId);
    if (!existing) {
      throw createNotFoundRepositoryError({
        entityType: "pattern_notification",
        entityId: notificationId,
        operation: "update"
      });
    }

    if (
      request.expectedVersion !== null &&
      existing.identity.version !== request.expectedVersion
    ) {
      throw createVersionMismatchRepositoryError({
        entityType: "pattern_notification",
        entityId: notificationId,
        operation: "update",
        expectedVersion: request.expectedVersion,
        actualVersion: existing.identity.version
      });
    }

    this.assertDeliveryGuardsHold(request, existing);

    this.recordsById.set(notificationId, clonePatternNotification(request.record));
    return clonePatternNotification(request.record);
  }

  /**
   * A losing racer must be told it lost. Reporting the stored version on both sides keeps this a
   * conflict rather than an overwrite, which is what makes the delivery side effect at-most-once.
   */
  private assertDeliveryGuardsHold(
    request: PatternNotificationUpdateRequest,
    existing: PatternNotificationDurableRecord
  ): void {
    const statusMismatch =
      request.expectedDeliveryStatus !== undefined &&
      existing.deliveryStatus !== request.expectedDeliveryStatus;
    const attemptMismatch =
      request.expectedDeliveryAttemptedAtUtc !== undefined &&
      existing.deliveryAttemptedAtUtc !== request.expectedDeliveryAttemptedAtUtc;

    if (!statusMismatch && !attemptMismatch) {
      return;
    }

    throw createVersionMismatchRepositoryError({
      entityType: "pattern_notification",
      entityId: existing.identity.entityId,
      operation: "update",
      expectedVersion: existing.identity.version,
      actualVersion: existing.identity.version
    });
  }

  private async assertReferencesExist(
    record: PatternNotificationDurableRecord
  ): Promise<void> {
    const checks: [PatternNotificationReferenceKind, string][] = [
      ["signal_candidate", record.signalCandidateId],
      ["setup_definition", record.setupDefinitionId],
      ["setup_definition_revision", record.setupRevisionId],
      ["monitored_symbol", record.monitoredSymbolId],
      ["setup_aggregate_result", record.setupAggregateResultId]
    ];

    for (const [referenceEntityType, referenceEntityId] of checks) {
      if (await this.references.referenceExists(referenceEntityType, referenceEntityId)) {
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
