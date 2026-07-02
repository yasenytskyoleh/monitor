import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ResearchFeedbackDecisionDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const RESEARCH_FEEDBACK_DECISION_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

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

const buildRelatedEntityIds = (decision: ResearchFeedbackDecision): string[] =>
  dedupeRelatedEntityIds([
    decision.setupDefinitionId,
    decision.researchHypothesisId,
    decision.setupAggregateResultId
  ]);

export const hydrateResearchFeedbackDecisionFromDurableRecord = (
  record: ResearchFeedbackDecisionDurableRecord
): ResearchFeedbackDecision => ({
  id: record.identity.entityId,
  setupDefinitionId: record.setupDefinitionId,
  researchHypothesisId: record.researchHypothesisId,
  ...(record.setupAggregateResultId
    ? { setupAggregateResultId: record.setupAggregateResultId }
    : {}),
  evidenceStatus: record.evidenceStatus,
  recommendedAction: record.recommendedAction,
  rationaleSummary: record.rationaleSummary,
  decisionStatus: record.decisionStatus,
  requiresManualReview: record.requiresManualReview,
  ...(record.evidenceSummary ? { evidenceSummary: record.evidenceSummary } : {}),
  ...(record.reviewerMetadata
    ? { reviewerMetadata: structuredClone(record.reviewerMetadata) }
    : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateResearchFeedbackDecisionToDurableRecord = (
  decision: ResearchFeedbackDecision,
  metadata: ProductRecordMetadata,
  version: number
): ResearchFeedbackDecisionDurableRecord => ({
  storageSchemaVersion: RESEARCH_FEEDBACK_DECISION_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "research_feedback_decision",
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
  setupDefinitionId: decision.setupDefinitionId,
  researchHypothesisId: decision.researchHypothesisId,
  setupAggregateResultId: decision.setupAggregateResultId ?? null,
  evidenceStatus: decision.evidenceStatus,
  recommendedAction: decision.recommendedAction,
  rationaleSummary: decision.rationaleSummary,
  requiresManualReview: decision.requiresManualReview,
  evidenceSummary: decision.evidenceSummary ?? null,
  reviewerMetadata: decision.reviewerMetadata ? structuredClone(decision.reviewerMetadata) : null
});
