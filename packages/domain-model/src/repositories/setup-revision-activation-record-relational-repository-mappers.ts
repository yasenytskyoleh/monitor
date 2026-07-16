import type { SetupRevisionActivationRecord } from "../review/setup-revision-activation-record.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type SetupRevisionActivationRecordDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const SETUP_REVISION_ACTIVATION_RECORD_SCHEMA_VERSION =
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

const dedupeRelatedEntityIds = (values: Array<string | null | undefined>): string[] => {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value) {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
};

const buildRelatedEntityIds = (activation: SetupRevisionActivationRecord): string[] =>
  dedupeRelatedEntityIds([
    activation.setupFamilyId,
    activation.targetRevisionId,
    activation.targetSetupDefinitionId,
    activation.previousRevisionId,
    activation.previousSetupDefinitionId
  ]);

export const hydrateSetupRevisionActivationRecordFromDurableRecord = (
  record: SetupRevisionActivationRecordDurableRecord
): SetupRevisionActivationRecord => ({
  id: record.identity.entityId,
  setupFamilyId: record.setupFamilyId,
  targetRevisionId: record.targetRevisionId,
  targetSetupDefinitionId: record.targetSetupDefinitionId,
  ...(record.previousRevisionId
    ? { previousRevisionId: record.previousRevisionId }
    : {}),
  ...(record.previousSetupDefinitionId
    ? { previousSetupDefinitionId: record.previousSetupDefinitionId }
    : {}),
  activatedBy: record.activatedBy,
  activatedAt: record.activatedAtUtc,
  activationOutcome: record.activationOutcome,
  ...(record.rationale ? { rationale: record.rationale } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateSetupRevisionActivationRecordToDurableRecord = (
  activation: SetupRevisionActivationRecord,
  metadata: ProductRecordMetadata,
  version: number
): SetupRevisionActivationRecordDurableRecord => ({
  storageSchemaVersion: SETUP_REVISION_ACTIVATION_RECORD_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "setup_revision_activation_record",
    entityId: activation.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(activation)
  },
  lifecycleStatus: "active",
  createdAtUtc: activation.createdAt,
  updatedAtUtc: activation.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  setupFamilyId: activation.setupFamilyId,
  targetRevisionId: activation.targetRevisionId,
  targetSetupDefinitionId: activation.targetSetupDefinitionId,
  previousRevisionId: activation.previousRevisionId ?? null,
  previousSetupDefinitionId: activation.previousSetupDefinitionId ?? null,
  activatedBy: activation.activatedBy,
  activatedAtUtc: activation.activatedAt,
  activationOutcome: activation.activationOutcome,
  rationale: activation.rationale ?? null
});
