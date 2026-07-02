import type { ResearchReviewDecision } from "../review/research-review-decision.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ResearchReviewDecisionDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const RESEARCH_REVIEW_DECISION_SCHEMA_VERSION =
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

const buildRelatedEntityIds = (decision: ResearchReviewDecision): string[] =>
  dedupeRelatedEntityIds([
    decision.researchReviewPacketId,
    decision.setupFamilyId,
    decision.setupRevisionId,
    decision.researchHypothesisId
  ]);

export const hydrateResearchReviewDecisionFromDurableRecord = (
  record: ResearchReviewDecisionDurableRecord
): ResearchReviewDecision => ({
  id: record.identity.entityId,
  researchReviewPacketId: record.researchReviewPacketId,
  setupFamilyId: record.setupFamilyId,
  ...(record.setupRevisionId ? { setupRevisionId: record.setupRevisionId } : {}),
  ...(record.researchHypothesisId
    ? { researchHypothesisId: record.researchHypothesisId }
    : {}),
  reviewedBy: record.reviewedBy,
  reviewedAt: record.reviewedAtUtc,
  decisionOutcome: record.decisionOutcome,
  ...(record.reviewerNotes ? { reviewerNotes: record.reviewerNotes } : {}),
  ...(record.authorizedNextAction
    ? { authorizedNextAction: record.authorizedNextAction }
    : {}),
  decisionStatus: record.decisionStatus,
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateResearchReviewDecisionToDurableRecord = (
  decision: ResearchReviewDecision,
  metadata: ProductRecordMetadata,
  version: number
): ResearchReviewDecisionDurableRecord => ({
  storageSchemaVersion: RESEARCH_REVIEW_DECISION_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "research_review_decision",
    entityId: decision.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(decision)
  },
  lifecycleStatus: "active",
  createdAtUtc: decision.createdAt,
  updatedAtUtc: decision.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  decisionStatus: decision.decisionStatus,
  researchReviewPacketId: decision.researchReviewPacketId,
  setupFamilyId: decision.setupFamilyId,
  setupRevisionId: decision.setupRevisionId ?? null,
  researchHypothesisId: decision.researchHypothesisId ?? null,
  reviewedBy: decision.reviewedBy,
  reviewedAtUtc: decision.reviewedAt,
  decisionOutcome: decision.decisionOutcome,
  reviewerNotes: decision.reviewerNotes ?? null,
  authorizedNextAction: decision.authorizedNextAction ?? null
});
