import type { SetupRefinementRequest } from "../review/setup-refinement-request.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type SetupRefinementRequestDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const SETUP_REFINEMENT_REQUEST_SCHEMA_VERSION =
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

const buildRelatedEntityIds = (request: SetupRefinementRequest): string[] =>
  dedupeRelatedEntityIds([
    request.setupDefinitionId,
    request.sourceResearchDecisionApprovalId,
    request.sourceResearchFeedbackDecisionId
  ]);

export const hydrateSetupRefinementRequestFromDurableRecord = (
  record: SetupRefinementRequestDurableRecord
): SetupRefinementRequest => ({
  id: record.identity.entityId,
  setupDefinitionId: record.setupDefinitionId,
  sourceResearchDecisionApprovalId: record.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: record.sourceResearchFeedbackDecisionId,
  refinementRationaleSummary: record.refinementRationaleSummary,
  requestedChangesSummary: record.requestedChangesSummary,
  ...(record.evidenceReferences.length > 0
    ? { evidenceReferences: [...record.evidenceReferences] }
    : {}),
  status: record.refinementStatus,
  requestedBy: record.requestedBy,
  requestedAt: record.requestedAtUtc,
  ...(record.assignedReviewerId
    ? { assignedReviewerId: record.assignedReviewerId }
    : {}),
  ...(record.assignedOwnerId ? { assignedOwnerId: record.assignedOwnerId } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateSetupRefinementRequestToDurableRecord = (
  request: SetupRefinementRequest,
  metadata: ProductRecordMetadata,
  version: number
): SetupRefinementRequestDurableRecord => ({
  storageSchemaVersion: SETUP_REFINEMENT_REQUEST_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "setup_refinement_request",
    entityId: request.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(request)
  },
  lifecycleStatus: "active",
  createdAtUtc: request.createdAt,
  updatedAtUtc: request.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  setupDefinitionId: request.setupDefinitionId,
  sourceResearchDecisionApprovalId: request.sourceResearchDecisionApprovalId,
  sourceResearchFeedbackDecisionId: request.sourceResearchFeedbackDecisionId,
  refinementStatus: request.status,
  refinementRationaleSummary: request.refinementRationaleSummary,
  requestedChangesSummary: request.requestedChangesSummary,
  evidenceReferences: [...(request.evidenceReferences ?? [])],
  requestedBy: request.requestedBy,
  requestedAtUtc: request.requestedAt,
  assignedReviewerId: request.assignedReviewerId ?? null,
  assignedOwnerId: request.assignedOwnerId ?? null
});
