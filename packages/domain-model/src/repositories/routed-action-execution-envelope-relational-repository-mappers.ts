import type { RoutedActionExecutionEnvelope } from "../execution/routed-action-execution-envelope.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type RoutedActionExecutionEnvelopeDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const ROUTED_ACTION_EXECUTION_ENVELOPE_SCHEMA_VERSION =
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

const normalizeJsonSnapshot = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const dedupeRelatedEntityIds = (values: Array<string | null | undefined>): string[] => {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value) {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
};

const buildRelatedEntityIds = (envelope: RoutedActionExecutionEnvelope): string[] =>
  dedupeRelatedEntityIds([
    envelope.sourceRoutingResultId,
    envelope.sourceReviewDecisionId,
    envelope.targetEntityRefs.setupFamilyId,
    envelope.targetEntityRefs.setupDefinitionId,
    envelope.targetEntityRefs.setupRevisionId,
    envelope.targetEntityRefs.researchHypothesisId,
    envelope.targetEntityRefs.researchFeedbackDecisionId,
    envelope.targetEntityRefs.researchDecisionApprovalId
  ]);

export const hydrateRoutedActionExecutionEnvelopeFromDurableRecord = (
  record: RoutedActionExecutionEnvelopeDurableRecord
): RoutedActionExecutionEnvelope => ({
  id: record.identity.entityId,
  sourceRoutingResultId: record.sourceRoutingResultId,
  sourceReviewDecisionId: record.sourceReviewDecisionId,
  actionTarget: record.actionTarget,
  actionCommandType: record.actionCommandType,
  targetEntityRefs: normalizeJsonSnapshot(record.targetEntityRefs),
  routeMetadataSnapshot: normalizeJsonSnapshot(record.routeMetadataSnapshot),
  executionPayloadSnapshot: normalizeJsonSnapshot(record.executionPayloadSnapshot),
  executionStatus: record.executionStatus,
  preparedBy: record.preparedBy,
  preparedAt: record.preparedAtUtc,
  ...(record.originRunId ? { originRunId: record.originRunId } : {}),
  ...(record.notes ? { notes: record.notes } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateRoutedActionExecutionEnvelopeToDurableRecord = (
  envelope: RoutedActionExecutionEnvelope,
  metadata: ProductRecordMetadata,
  version: number
): RoutedActionExecutionEnvelopeDurableRecord => ({
  storageSchemaVersion: ROUTED_ACTION_EXECUTION_ENVELOPE_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "routed_action_execution_envelope",
    entityId: envelope.id,
    version,
    relatedEntityIds: buildRelatedEntityIds(envelope)
  },
  lifecycleStatus: "active",
  createdAtUtc: envelope.createdAt,
  updatedAtUtc: envelope.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  executionStatus: envelope.executionStatus,
  sourceRoutingResultId: envelope.sourceRoutingResultId,
  sourceReviewDecisionId: envelope.sourceReviewDecisionId,
  actionTarget: envelope.actionTarget,
  actionCommandType: envelope.actionCommandType,
  targetEntityRefs: normalizeJsonSnapshot(envelope.targetEntityRefs),
  routeMetadataSnapshot: normalizeJsonSnapshot(envelope.routeMetadataSnapshot),
  executionPayloadSnapshot: normalizeJsonSnapshot(envelope.executionPayloadSnapshot),
  preparedBy: envelope.preparedBy,
  preparedAtUtc: envelope.preparedAt,
  originRunId: envelope.originRunId ?? null,
  notes: envelope.notes ?? null
});
