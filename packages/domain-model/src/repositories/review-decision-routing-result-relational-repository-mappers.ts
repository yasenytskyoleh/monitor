import type { ReviewDecisionRoutingResult } from "../review/review-decision-routing-result.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ReviewDecisionRoutingResultDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const REVIEW_DECISION_ROUTING_RESULT_SCHEMA_VERSION =
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

const dedupeRelatedEntityIds = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

type PersistableReviewDecisionRoutingResult = ReviewDecisionRoutingResult & {
  status: "routed" | "no_action";
  routingId: string;
  researchReviewDecisionId: string;
  setupFamilyId: string;
  decisionOutcome: NonNullable<ReviewDecisionRoutingResult["decisionOutcome"]>;
  downstreamCommandType: NonNullable<ReviewDecisionRoutingResult["downstreamCommandType"]>;
  routedAt: string;
};

const assertPersistableRoutingResult: (
  result: ReviewDecisionRoutingResult
) => asserts result is PersistableReviewDecisionRoutingResult = (result) => {
  if (result.status !== "routed" && result.status !== "no_action") {
    throw new Error(`review_decision_routing_result cannot persist status: ${result.status}`);
  }

  const requiredFields = [
    ["routingId", result.routingId],
    ["researchReviewDecisionId", result.researchReviewDecisionId],
    ["setupFamilyId", result.setupFamilyId],
    ["decisionOutcome", result.decisionOutcome],
    ["downstreamCommandType", result.downstreamCommandType],
    ["routedAt", result.routedAt]
  ] as const;
  const missingField = requiredFields.find(([, value]) => !value);
  if (missingField) {
    throw new Error(`review_decision_routing_result ${missingField[0]} is required`);
  }
};

export const hydrateReviewDecisionRoutingResultFromDurableRecord = (
  record: ReviewDecisionRoutingResultDurableRecord
): ReviewDecisionRoutingResult => ({
  status: record.routingStatus,
  routingId: record.identity.entityId,
  researchReviewDecisionId: record.researchReviewDecisionId,
  setupFamilyId: record.setupFamilyId,
  ...(record.setupRevisionId ? { setupRevisionId: record.setupRevisionId } : {}),
  decisionOutcome: record.decisionOutcome,
  ...(record.authorizedNextAction
    ? { authorizedNextAction: record.authorizedNextAction }
    : {}),
  ...(record.target ? { target: record.target } : {}),
  downstreamCommandType: record.downstreamCommandType,
  routedAt: record.routedAtUtc,
  ...(record.reason ? { reason: record.reason } : {}),
  warnings: [...record.warnings]
});

export const dehydrateReviewDecisionRoutingResultToDurableRecord = (
  result: ReviewDecisionRoutingResult,
  metadata: ProductRecordMetadata,
  version: number
): ReviewDecisionRoutingResultDurableRecord => {
  assertPersistableRoutingResult(result);

  return {
    storageSchemaVersion: REVIEW_DECISION_ROUTING_RESULT_SCHEMA_VERSION,
    identity: {
      boundary: "product_domain",
      entityType: "review_decision_routing_result",
      entityId: result.routingId,
      version,
      relatedEntityIds: dedupeRelatedEntityIds([
        result.researchReviewDecisionId,
        result.setupFamilyId,
        result.setupRevisionId
      ])
    },
    lifecycleStatus: "active",
    createdAtUtc: result.routedAt,
    updatedAtUtc: result.routedAt,
    archivedAtUtc: null,
    metadata: cloneMetadata(metadata),
    routingStatus: result.status,
    researchReviewDecisionId: result.researchReviewDecisionId,
    setupFamilyId: result.setupFamilyId,
    setupRevisionId: result.setupRevisionId ?? null,
    decisionOutcome: result.decisionOutcome,
    authorizedNextAction: result.authorizedNextAction ?? null,
    target: result.target ?? null,
    downstreamCommandType: result.downstreamCommandType,
    routedAtUtc: result.routedAt,
    reason: result.reason ?? null,
    warnings: [...result.warnings]
  };
};
