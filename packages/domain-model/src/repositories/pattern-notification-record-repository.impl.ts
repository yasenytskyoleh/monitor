import type { PatternNotificationRecord } from "../notification/pattern-notification-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import {
  createAlreadyExistsRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import { assertPatternNotificationEvidenceIsUnchanged } from "./pattern-notification-record-repository.js";
import type {
  PatternNotificationRecordCreateRequest,
  PatternNotificationRecordRepository,
  PatternNotificationRecordUpdateRequest
} from "./pattern-notification-record-repository.js";

type PersistedPatternNotificationRecord = {
  notification: PatternNotificationRecord;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneNotification = (notification: PatternNotificationRecord): PatternNotificationRecord =>
  structuredClone(notification);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export class InMemoryPatternNotificationRecordRepository
  implements PatternNotificationRecordRepository
{
  private readonly recordsById = new Map<string, PersistedPatternNotificationRecord>();

  async getById(notificationId: string): Promise<PatternNotificationRecord | null> {
    const record = this.recordsById.get(notificationId);
    return record ? cloneNotification(record.notification) : null;
  }

  async getByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationRecord | null> {
    const record = [...this.recordsById.values()].find(
      (candidate) => candidate.notification.deduplicationKey === deduplicationKey
    );
    return record ? cloneNotification(record.notification) : null;
  }

  async listByDeliveryStatus(
    statuses: PatternNotificationRecord["deliveryStatus"][]
  ): Promise<PatternNotificationRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.recordsById.values()]
      .filter((record) => allowedStatuses.has(record.notification.deliveryStatus))
      .map((record) => cloneNotification(record.notification));
  }

  async create(
    request: PatternNotificationRecordCreateRequest
  ): Promise<PatternNotificationRecord> {
    const { notification } = request;
    if (
      this.recordsById.has(notification.notificationId) ||
      [...this.recordsById.values()].some(
        (record) => record.notification.deduplicationKey === notification.deduplicationKey
      )
    ) {
      throw createAlreadyExistsRepositoryError({
        entityType: "pattern_notification",
        entityId: notification.notificationId,
        operation: "create"
      });
    }

    const persisted = cloneNotification(notification);
    this.recordsById.set(notification.notificationId, {
      notification: persisted,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneNotification(persisted);
  }

  async update(
    request: PatternNotificationRecordUpdateRequest
  ): Promise<PatternNotificationRecord> {
    const { notification } = request;
    const current = this.recordsById.get(notification.notificationId);
    if (!current) {
      throw createNotFoundRepositoryError({
        entityType: "pattern_notification",
        entityId: notification.notificationId,
        operation: "update"
      });
    }
    if (request.expectedVersion !== null && request.expectedVersion !== current.version) {
      throw createVersionMismatchRepositoryError({
        entityType: "pattern_notification",
        entityId: notification.notificationId,
        operation: "update",
        expectedVersion: request.expectedVersion ?? current.version,
        actualVersion: current.version
      });
    }
    if (
      request.expectedDeliveryStatus !== undefined &&
      request.expectedDeliveryStatus !== current.notification.deliveryStatus
    ) {
      throw createVersionMismatchRepositoryError({
        entityType: "pattern_notification",
        entityId: notification.notificationId,
        operation: "update",
        expectedVersion: request.expectedVersion ?? current.version,
        actualVersion: current.version
      });
    }
    if (
      request.expectedDeliveryAttemptedAt !== undefined &&
      request.expectedDeliveryAttemptedAt !== current.notification.deliveryAttemptedAt
    ) {
      throw createVersionMismatchRepositoryError({
        entityType: "pattern_notification",
        entityId: notification.notificationId,
        operation: "update",
        expectedVersion: request.expectedVersion ?? current.version,
        actualVersion: current.version
      });
    }

    assertPatternNotificationEvidenceIsUnchanged(current.notification, notification);
    const persisted = cloneNotification(notification);
    this.recordsById.set(notification.notificationId, {
      notification: persisted,
      version: current.version + 1,
      metadata: cloneMetadata(request.metadata)
    });
    return cloneNotification(persisted);
  }
}
