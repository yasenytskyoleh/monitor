import type { ExecutionAttemptAudit } from "../execution/execution-attempt-audit.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ExecutionAttemptAuditDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const EXECUTION_ATTEMPT_AUDIT_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const buildRelatedEntityIds = (audit: ExecutionAttemptAudit): string[] =>
  [
    audit.routedActionExecutionEnvelopeId,
    audit.reviewDecisionRoutingResultId,
    audit.researchReviewDecisionId
  ].filter((value): value is string => Boolean(value));

export const hydrateExecutionAttemptAuditFromDurableRecord = (
  record: ExecutionAttemptAuditDurableRecord
): ExecutionAttemptAudit => ({
  attemptId: record.identity.entityId,
  ...(record.routedActionExecutionEnvelopeId
    ? { routedActionExecutionEnvelopeId: record.routedActionExecutionEnvelopeId }
    : {}),
  ...(record.reviewDecisionRoutingResultId
    ? { reviewDecisionRoutingResultId: record.reviewDecisionRoutingResultId }
    : {}),
  ...(record.researchReviewDecisionId
    ? { researchReviewDecisionId: record.researchReviewDecisionId }
    : {}),
  actionTarget: record.actionTarget,
  downstreamCommandType: record.downstreamCommandType,
  status: record.executionAttemptAuditStatus,
  attemptedBy: record.attemptedBy,
  attemptedAt: record.attemptedAtUtc,
  ...(record.completedAtUtc ? { completedAt: record.completedAtUtc } : {}),
  ...(record.outcomeCode ? { outcomeCode: record.outcomeCode } : {}),
  ...(record.outcomeSummary ? { outcomeSummary: record.outcomeSummary } : {}),
  warningCodes: [...record.warningCodes],
  createdAtUtc: record.createdAtUtc,
  updatedAtUtc: record.updatedAtUtc
});

export const dehydrateExecutionAttemptAuditToDurableRecord = (
  audit: ExecutionAttemptAudit,
  metadata: ProductRecordMetadata,
  version: number
): ExecutionAttemptAuditDurableRecord => ({
  storageSchemaVersion: EXECUTION_ATTEMPT_AUDIT_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "execution_attempt_audit",
    entityId: audit.attemptId,
    version,
    relatedEntityIds: buildRelatedEntityIds(audit)
  },
  lifecycleStatus: "active",
  createdAtUtc: audit.createdAtUtc,
  updatedAtUtc: audit.updatedAtUtc,
  archivedAtUtc: null,
  metadata: structuredClone(metadata),
  executionAttemptAuditStatus: audit.status,
  routedActionExecutionEnvelopeId: audit.routedActionExecutionEnvelopeId ?? null,
  reviewDecisionRoutingResultId: audit.reviewDecisionRoutingResultId ?? null,
  researchReviewDecisionId: audit.researchReviewDecisionId ?? null,
  actionTarget: audit.actionTarget,
  downstreamCommandType: audit.downstreamCommandType,
  attemptedBy: audit.attemptedBy,
  attemptedAtUtc: audit.attemptedAt,
  completedAtUtc: audit.completedAt ?? null,
  outcomeCode: audit.outcomeCode ?? null,
  outcomeSummary: audit.outcomeSummary ?? null,
  warningCodes: [...audit.warningCodes]
});
