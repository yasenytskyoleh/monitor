import type { SetupAggregateResult } from "../research/setup-aggregate-result.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  decomposeSetupAggregateScope,
  type SetupAggregateResultDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const SETUP_AGGREGATE_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const dedupeRelatedEntityIds = (values: Array<string | null | undefined>): string[] => {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value) {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
};

const buildSetupAggregateRelatedEntityIds = (aggregate: SetupAggregateResult): string[] =>
  dedupeRelatedEntityIds([
    aggregate.setupDefinitionId,
    aggregate.researchHypothesisId,
    aggregate.aggregationScope.evaluationWindowId,
    ...aggregate.aggregationScope.symbolScope.symbolIds,
    aggregate.aggregationScope.researchRunId,
    aggregate.aggregationScope.hypothesisId
  ]);

export const hydrateSetupAggregateResultFromDurableRecord = (
  record: SetupAggregateResultDurableRecord
): SetupAggregateResult => ({
  id: record.identity.entityId,
  setupDefinitionId: record.setupDefinitionId,
  ...(record.researchHypothesisId ? { researchHypothesisId: record.researchHypothesisId } : {}),
  aggregationScope: structuredClone(record.aggregationScope),
  status: record.aggregateStatus,
  totalCandidates: record.totalCandidates,
  completedEvaluations: record.completedEvaluations,
  invalidatedEvaluations: record.invalidatedEvaluations,
  averagePercentageMove: record.averagePercentageMove,
  averageAbsoluteMove: record.averageAbsoluteMove,
  averageFinalOutcome: record.averageFinalOutcome,
  averageMaxFavorableExcursion: record.averageMaxFavorableExcursion,
  averageMaxAdverseExcursion: record.averageMaxAdverseExcursion,
  positiveOutcomeCount: record.positiveOutcomeCount,
  computedAt: record.computedAtUtc,
  ...(record.notes ? { notes: record.notes } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateSetupAggregateResultToDurableRecord = (
  aggregate: SetupAggregateResult,
  metadata: ProductRecordMetadata,
  version: number
): SetupAggregateResultDurableRecord => {
  const scopeSnapshot = decomposeSetupAggregateScope(aggregate.aggregationScope);

  return {
    storageSchemaVersion: SETUP_AGGREGATE_SCHEMA_VERSION,
    identity: {
      boundary: "product_domain",
      entityType: "setup_aggregate_result",
      entityId: aggregate.id,
      version,
      relatedEntityIds: buildSetupAggregateRelatedEntityIds(aggregate)
    },
    lifecycleStatus: "active",
    createdAtUtc: aggregate.createdAt,
    updatedAtUtc: aggregate.updatedAt,
    archivedAtUtc: null,
    metadata: cloneMetadata(metadata),
    aggregateStatus: aggregate.status,
    setupDefinitionId: aggregate.setupDefinitionId,
    researchHypothesisId: aggregate.researchHypothesisId ?? null,
    aggregationScope: structuredClone(aggregate.aggregationScope),
    scopeKey: scopeSnapshot.scopeKey,
    totalCandidates: aggregate.totalCandidates,
    completedEvaluations: aggregate.completedEvaluations,
    invalidatedEvaluations: aggregate.invalidatedEvaluations,
    averagePercentageMove: aggregate.averagePercentageMove,
    averageAbsoluteMove: aggregate.averageAbsoluteMove,
    averageFinalOutcome: aggregate.averageFinalOutcome,
    averageMaxFavorableExcursion: aggregate.averageMaxFavorableExcursion,
    averageMaxAdverseExcursion: aggregate.averageMaxAdverseExcursion,
    positiveOutcomeCount: aggregate.positiveOutcomeCount,
    computedAtUtc: aggregate.computedAt,
    notes: aggregate.notes ?? null
  };
};
