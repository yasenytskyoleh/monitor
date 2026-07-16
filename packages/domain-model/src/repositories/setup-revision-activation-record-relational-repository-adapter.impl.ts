import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";
import type { SetupDefinitionRevisionDurableRecord } from "../storage/setup-definition-revision-relational-slice.js";
import type { SetupRevisionActivationRecordDurableRecord } from "../storage/setup-revision-activation-record-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  SetupRevisionActivationRecordRecordWriteRequest,
  SetupRevisionActivationRecordRelationalRepositoryAdapter
} from "./setup-revision-activation-record-relational-repository-adapter.js";

export type SetupRevisionActivationRecordRelationalReferenceReader = {
  loadSetupDefinitionRecord(
    setupDefinitionId: string
  ): Promise<SetupDefinitionDurableRecord | null>;
  loadSetupDefinitionRevisionRecord(
    setupDefinitionRevisionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null>;
};

const cloneSetupRevisionActivationRecord = (
  record: SetupRevisionActivationRecordDurableRecord
): SetupRevisionActivationRecordDurableRecord => structuredClone(record);

export class InMemorySetupRevisionActivationRecordRelationalRepositoryAdapter
  implements SetupRevisionActivationRecordRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, SetupRevisionActivationRecordDurableRecord>();

  constructor(
    private readonly references: SetupRevisionActivationRecordRelationalReferenceReader
  ) {}

  async loadSetupRevisionActivationRecord(
    setupRevisionActivationRecordId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord | null> {
    const record = this.recordsById.get(setupRevisionActivationRecordId);
    return record ? cloneSetupRevisionActivationRecord(record) : null;
  }

  async listSetupRevisionActivationRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.setupFamilyId === setupFamilyId)
      .map((record) => cloneSetupRevisionActivationRecord(record));
  }

  async listSetupRevisionActivationRecordsByTargetRevisionId(
    targetRevisionId: string
  ): Promise<SetupRevisionActivationRecordDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.targetRevisionId === targetRevisionId)
      .map((record) => cloneSetupRevisionActivationRecord(record));
  }

  async insertSetupRevisionActivationRecord(
    request: SetupRevisionActivationRecordRecordWriteRequest
  ): Promise<SetupRevisionActivationRecordDurableRecord> {
    const setupRevisionActivationRecordId = request.record.identity.entityId;
    if (this.recordsById.has(setupRevisionActivationRecordId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: setupRevisionActivationRecordId,
        operation: "create"
      });
    }

    const targetRevision = await this.assertSetupDefinitionRevisionReferenceExists(
      request.record,
      request.record.targetRevisionId
    );
    await this.assertSetupDefinitionReferenceExists(
      request.record,
      request.record.targetSetupDefinitionId
    );
    const previousRevision = await this.loadSetupDefinitionRevisionReference(
      request.record,
      request.record.previousRevisionId
    );
    await this.assertSetupDefinitionReferenceExists(
      request.record,
      request.record.previousSetupDefinitionId
    );

    this.assertDistinctPreviousRevision(request.record);
    this.assertDistinctPreviousSetupDefinition(request.record);
    this.assertTargetRevisionSetupFamilyMatch(request.record, targetRevision);
    this.assertTargetRevisionSetupDefinitionMatch(request.record, targetRevision);
    this.assertPreviousRevisionSetupFamilyMatch(request.record, previousRevision);
    this.assertPreviousRevisionSetupDefinitionMatch(request.record, previousRevision);

    const record = cloneSetupRevisionActivationRecord(request.record);
    this.recordsById.set(setupRevisionActivationRecordId, record);
    return cloneSetupRevisionActivationRecord(record);
  }

  private async assertSetupDefinitionReferenceExists(
    record: SetupRevisionActivationRecordDurableRecord,
    setupDefinitionId: string | null
  ): Promise<void> {
    if (!setupDefinitionId) {
      return;
    }

    const setupDefinition = await this.references.loadSetupDefinitionRecord(setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition",
        referenceEntityId: setupDefinitionId
      });
    }
  }

  private async assertSetupDefinitionRevisionReferenceExists(
    record: SetupRevisionActivationRecordDurableRecord,
    setupDefinitionRevisionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord> {
    const setupDefinitionRevision = await this.loadSetupDefinitionRevisionReference(
      record,
      setupDefinitionRevisionId
    );
    if (!setupDefinitionRevision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: setupDefinitionRevisionId
      });
    }

    return setupDefinitionRevision;
  }

  private async loadSetupDefinitionRevisionReference(
    record: SetupRevisionActivationRecordDurableRecord,
    setupDefinitionRevisionId: string | null
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    if (!setupDefinitionRevisionId) {
      return null;
    }

    const setupDefinitionRevision =
      await this.references.loadSetupDefinitionRevisionRecord(setupDefinitionRevisionId);
    if (!setupDefinitionRevision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: setupDefinitionRevisionId
      });
    }

    return setupDefinitionRevision;
  }

  private assertDistinctPreviousRevision(
    record: SetupRevisionActivationRecordDurableRecord
  ): void {
    if (
      record.previousRevisionId &&
      record.previousRevisionId === record.targetRevisionId
    ) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: record.previousRevisionId
      });
    }
  }

  private assertDistinctPreviousSetupDefinition(
    record: SetupRevisionActivationRecordDurableRecord
  ): void {
    if (
      record.previousSetupDefinitionId &&
      record.previousSetupDefinitionId === record.targetSetupDefinitionId
    ) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition",
        referenceEntityId: record.previousSetupDefinitionId
      });
    }
  }

  private assertTargetRevisionSetupFamilyMatch(
    record: SetupRevisionActivationRecordDurableRecord,
    targetRevision: SetupDefinitionRevisionDurableRecord
  ): void {
    if (targetRevision.setupFamilyId !== record.setupFamilyId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: record.targetRevisionId
      });
    }
  }

  private assertTargetRevisionSetupDefinitionMatch(
    record: SetupRevisionActivationRecordDurableRecord,
    targetRevision: SetupDefinitionRevisionDurableRecord
  ): void {
    if (targetRevision.setupDefinitionId !== record.targetSetupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: record.targetRevisionId
      });
    }
  }

  private assertPreviousRevisionSetupFamilyMatch(
    record: SetupRevisionActivationRecordDurableRecord,
    previousRevision: SetupDefinitionRevisionDurableRecord | null
  ): void {
    if (!previousRevision) {
      return;
    }

    if (previousRevision.setupFamilyId !== record.setupFamilyId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: previousRevision.identity.entityId
      });
    }
  }

  private assertPreviousRevisionSetupDefinitionMatch(
    record: SetupRevisionActivationRecordDurableRecord,
    previousRevision: SetupDefinitionRevisionDurableRecord | null
  ): void {
    if (!previousRevision || !record.previousSetupDefinitionId) {
      return;
    }

    if (previousRevision.setupDefinitionId !== record.previousSetupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_revision_activation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition_revision",
        referenceEntityId: previousRevision.identity.entityId
      });
    }
  }
}
