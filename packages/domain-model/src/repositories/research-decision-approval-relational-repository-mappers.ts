import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ResearchDecisionApprovalDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const RESEARCH_DECISION_APPROVAL_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

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

const buildRelatedEntityIds = (approval: ResearchDecisionApproval): string[] =>
  dedupeRelatedEntityIds([
    approval.researchFeedbackDecisionId,
    approval.setupDefinitionId
  ]);

export const hydrateResearchDecisionApprovalFromDurableRecord = (
  record: ResearchDecisionApprovalDurableRecord
): ResearchDecisionApproval => ({
  id: record.identity.entityId,
  researchFeedbackDecisionId: record.researchFeedbackDecisionId,
  setupDefinitionId: record.setupDefinitionId,
  reviewedBy: record.reviewedBy,
  reviewedAt: record.reviewedAtUtc,
  approvalOutcome: record.approvalOutcome,
  approvalStatus: record.approvalStatus,
  ...(record.reviewerNotes ? { reviewerNotes: record.reviewerNotes } : {}),
  ...(record.authorizedNextAction
    ? { authorizedNextAction: record.authorizedNextAction }
    : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateResearchDecisionApprovalToDurableRecord = (
  approval: ResearchDecisionApproval,
  metadata: ProductRecordMetadata,
  version: number
): ResearchDecisionApprovalDurableRecord => ({
  storageSchemaVersion: RESEARCH_DECISION_APPROVAL_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "research_decision_approval",
    entityId: approval.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(approval)
  },
  lifecycleStatus: "active",
  createdAtUtc: approval.createdAt,
  updatedAtUtc: approval.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  approvalStatus: approval.approvalStatus,
  researchFeedbackDecisionId: approval.researchFeedbackDecisionId,
  setupDefinitionId: approval.setupDefinitionId,
  reviewedBy: approval.reviewedBy,
  reviewedAtUtc: approval.reviewedAt,
  approvalOutcome: approval.approvalOutcome,
  reviewerNotes: approval.reviewerNotes ?? null,
  authorizedNextAction: approval.authorizedNextAction ?? null
});
