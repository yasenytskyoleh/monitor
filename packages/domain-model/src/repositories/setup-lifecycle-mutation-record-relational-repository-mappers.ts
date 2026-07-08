import type { SetupLifecycleMutationRecord } from "../review/setup-lifecycle-mutation-record.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type SetupLifecycleMutationRecordDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const SETUP_LIFECYCLE_MUTATION_RECORD_SCHEMA_VERSION =
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

const buildRelatedEntityIds = (mutation: SetupLifecycleMutationRecord): string[] =>
  dedupeRelatedEntityIds([
    mutation.setupDefinitionId,
    mutation.researchDecisionApprovalId,
    mutation.researchFeedbackDecisionId
  ]);

export const hydrateSetupLifecycleMutationRecordFromDurableRecord = (
  record: SetupLifecycleMutationRecordDurableRecord
): SetupLifecycleMutationRecord => ({
  id: record.identity.entityId,
  setupDefinitionId: record.setupDefinitionId,
  researchDecisionApprovalId: record.researchDecisionApprovalId,
  researchFeedbackDecisionId: record.researchFeedbackDecisionId,
  previousStatus: record.previousStatus,
  newStatus: record.newStatus,
  approvedAction: record.approvedAction,
  mutatedBy: record.mutatedBy,
  mutatedAt: record.mutatedAtUtc,
  ...(record.notes ? { notes: record.notes } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateSetupLifecycleMutationRecordToDurableRecord = (
  mutation: SetupLifecycleMutationRecord,
  metadata: ProductRecordMetadata,
  version: number
): SetupLifecycleMutationRecordDurableRecord => ({
  storageSchemaVersion: SETUP_LIFECYCLE_MUTATION_RECORD_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "setup_lifecycle_mutation_record",
    entityId: mutation.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(mutation)
  },
  lifecycleStatus: "active",
  createdAtUtc: mutation.createdAt,
  updatedAtUtc: mutation.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  setupDefinitionId: mutation.setupDefinitionId,
  researchDecisionApprovalId: mutation.researchDecisionApprovalId,
  researchFeedbackDecisionId: mutation.researchFeedbackDecisionId,
  previousStatus: mutation.previousStatus,
  newStatus: mutation.newStatus,
  approvedAction: mutation.approvedAction,
  mutatedBy: mutation.mutatedBy,
  mutatedAtUtc: mutation.mutatedAt,
  notes: mutation.notes ?? null
});
