import type { SetupDefinitionRevision } from "../review/setup-definition-revision.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type SetupDefinitionRevisionDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const SETUP_DEFINITION_REVISION_SCHEMA_VERSION =
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

const buildRelatedEntityIds = (revision: SetupDefinitionRevision): string[] =>
  dedupeRelatedEntityIds([
    revision.setupDefinitionId,
    revision.previousSetupDefinitionId,
    revision.sourceSetupRefinementRequestId,
    revision.sourceResearchDecisionApprovalId,
    revision.sourceResearchFeedbackDecisionId,
    revision.versionInfo.previousRevisionId
  ]);

export const hydrateSetupDefinitionRevisionFromDurableRecord = (
  record: SetupDefinitionRevisionDurableRecord
): SetupDefinitionRevision => ({
  id: record.identity.entityId,
  setupDefinitionId: record.setupDefinitionId,
  ...(record.previousSetupDefinitionId
    ? { previousSetupDefinitionId: record.previousSetupDefinitionId }
    : {}),
  versionInfo: {
    setupFamilyId: record.setupFamilyId,
    revisionId: record.identity.entityId,
    version: record.setupVersionNumber,
    ...(record.previousRevisionId ? { previousRevisionId: record.previousRevisionId } : {})
  },
  revisionReason: record.revisionReason,
  revisionStatus: record.revisionStatus,
  changedFieldsSummary: record.changedFieldsSummary,
  createdBy: record.createdBy,
  createdAt: record.createdAtUtc,
  ...(record.notes ? { notes: record.notes } : {}),
  sourceSetupRefinementRequestId: record.sourceSetupRefinementRequestId,
  ...(record.sourceResearchDecisionApprovalId
    ? { sourceResearchDecisionApprovalId: record.sourceResearchDecisionApprovalId }
    : {}),
  ...(record.sourceResearchFeedbackDecisionId
    ? { sourceResearchFeedbackDecisionId: record.sourceResearchFeedbackDecisionId }
    : {}),
  updatedAt: record.updatedAtUtc
});

export const dehydrateSetupDefinitionRevisionToDurableRecord = (
  revision: SetupDefinitionRevision,
  metadata: ProductRecordMetadata,
  version: number
): SetupDefinitionRevisionDurableRecord => ({
  storageSchemaVersion: SETUP_DEFINITION_REVISION_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition_revision",
    entityId: revision.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(revision)
  },
  lifecycleStatus: "active",
  createdAtUtc: revision.createdAt,
  updatedAtUtc: revision.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  setupDefinitionId: revision.setupDefinitionId,
  previousSetupDefinitionId: revision.previousSetupDefinitionId ?? null,
  setupFamilyId: revision.versionInfo.setupFamilyId,
  setupVersionNumber: revision.versionInfo.version,
  previousRevisionId: revision.versionInfo.previousRevisionId ?? null,
  revisionReason: revision.revisionReason,
  revisionStatus: revision.revisionStatus,
  changedFieldsSummary: revision.changedFieldsSummary,
  createdBy: revision.createdBy,
  notes: revision.notes ?? null,
  sourceSetupRefinementRequestId: revision.sourceSetupRefinementRequestId,
  sourceResearchDecisionApprovalId: revision.sourceResearchDecisionApprovalId ?? null,
  sourceResearchFeedbackDecisionId: revision.sourceResearchFeedbackDecisionId ?? null
});
