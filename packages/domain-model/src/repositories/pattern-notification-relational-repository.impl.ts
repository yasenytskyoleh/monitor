import type { PatternNotificationRecord } from "../notification/pattern-notification-record.js";
import type { PatternNotificationRelationalRepositoryAdapter } from "./pattern-notification-relational-repository-adapter.js";
import {
  dehydratePatternNotificationToDurableRecord,
  hydratePatternNotificationFromDurableRecord
} from "./pattern-notification-relational-repository-mappers.js";
import {
  assertPatternNotificationEvidenceIsUnchanged,
  type PatternNotificationRecordCreateRequest,
  type PatternNotificationRecordRepository,
  type PatternNotificationRecordUpdateRequest
} from "./pattern-notification-record-repository.js";
import { createNotFoundRepositoryError } from "./repository-error.js";

const FIRST_VERSION = 1;

export class RelationalPatternNotificationRecordRepository
  implements PatternNotificationRecordRepository
{
  constructor(private readonly adapter: PatternNotificationRelationalRepositoryAdapter) {}

  async getById(notificationId: string): Promise<PatternNotificationRecord | null> {
    const record = await this.adapter.loadPatternNotification(notificationId);
    return record ? hydratePatternNotificationFromDurableRecord(record) : null;
  }

  async getByDeduplicationKey(
    deduplicationKey: string
  ): Promise<PatternNotificationRecord | null> {
    const record = await this.adapter.loadPatternNotificationByDeduplicationKey(
      deduplicationKey
    );
    return record ? hydratePatternNotificationFromDurableRecord(record) : null;
  }

  async listByDeliveryStatus(
    statuses: PatternNotificationRecord["deliveryStatus"][],
    limit: number
  ): Promise<PatternNotificationRecord[]> {
    const records = await this.adapter.listPatternNotificationsByDeliveryStatus({
      statuses,
      limit
    });

    return records.map((record) => hydratePatternNotificationFromDurableRecord(record));
  }

  async create(
    request: PatternNotificationRecordCreateRequest
  ): Promise<PatternNotificationRecord> {
    const record = await this.adapter.insertPatternNotification({
      record: dehydratePatternNotificationToDurableRecord(
        request.notification,
        request.metadata,
        FIRST_VERSION
      )
    });

    return hydratePatternNotificationFromDurableRecord(record);
  }

  async update(
    request: PatternNotificationRecordUpdateRequest
  ): Promise<PatternNotificationRecord> {
    const notificationId = request.notification.notificationId;
    const current = await this.adapter.loadPatternNotification(notificationId);
    if (!current) {
      throw createNotFoundRepositoryError({
        entityType: "pattern_notification",
        entityId: notificationId,
        operation: "update"
      });
    }

    assertPatternNotificationEvidenceIsUnchanged(
      hydratePatternNotificationFromDurableRecord(current),
      request.notification
    );

    const record = await this.adapter.updatePatternNotification({
      record: dehydratePatternNotificationToDurableRecord(
        request.notification,
        request.metadata,
        current.identity.version + 1
      ),
      expectedVersion: request.expectedVersion ?? current.identity.version,
      ...(request.expectedDeliveryStatus
        ? { expectedDeliveryStatus: request.expectedDeliveryStatus }
        : {}),
      ...(request.expectedDeliveryAttemptedAt
        ? { expectedDeliveryAttemptedAtUtc: request.expectedDeliveryAttemptedAt }
        : {})
    });

    return hydratePatternNotificationFromDurableRecord(record);
  }
}
