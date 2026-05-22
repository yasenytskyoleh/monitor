import type { EvaluationResult } from "../evaluation.js";
import type { SignalCandidate } from "../signal-candidate.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type EvaluationResultDurableRecord,
  type SignalCandidateDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const SIGNAL_EVALUATION_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);
const cloneString = (value: string | undefined): string | null => (value ? value : null);

const buildSignalCandidateRelatedEntityIds = (candidate: SignalCandidate): string[] =>
  [
    candidate.setupDefinitionId,
    candidate.setupRevisionId,
    candidate.monitoredSymbolId,
    ...(candidate.detectionHitId ? [candidate.detectionHitId] : [])
  ].filter(Boolean);

export const hydrateSignalCandidateFromDurableRecord = (
  record: SignalCandidateDurableRecord
): SignalCandidate => ({
  id: record.identity.entityId,
  setupDefinitionId: record.setupDefinitionId,
  setupRevisionId: record.setupRevisionId,
  monitoredSymbolId: record.monitoredSymbolId,
  ...(record.detectionHitId ? { detectionHitId: record.detectionHitId } : {}),
  status: record.candidateStatus,
  detectedAt: record.detectedAtUtc,
  evidenceSummary: record.evidenceSummary,
  ...(record.candidateOriginRunId ? { originRunId: record.candidateOriginRunId } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateSignalCandidateToDurableRecord = (
  candidate: SignalCandidate,
  metadata: ProductRecordMetadata,
  version: number
): SignalCandidateDurableRecord => ({
  storageSchemaVersion: SIGNAL_EVALUATION_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "signal_candidate",
    entityId: candidate.id,
    version,
    relatedEntityIds: buildSignalCandidateRelatedEntityIds(candidate)
  },
  lifecycleStatus: "active",
  createdAtUtc: candidate.createdAt,
  updatedAtUtc: candidate.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  candidateStatus: candidate.status,
  setupDefinitionId: candidate.setupDefinitionId,
  setupRevisionId: candidate.setupRevisionId,
  monitoredSymbolId: candidate.monitoredSymbolId,
  detectionHitId: cloneString(candidate.detectionHitId),
  detectedAtUtc: candidate.detectedAt,
  evidenceSummary: candidate.evidenceSummary,
  candidateOriginRunId: cloneString(candidate.originRunId)
});

export const hydrateEvaluationResultFromDurableRecord = (
  record: EvaluationResultDurableRecord
): EvaluationResult => ({
  id: record.identity.entityId,
  signalCandidateId: record.signalCandidateId,
  evaluationWindowId: record.evaluationWindowId,
  status: record.evaluationStatus,
  referencePrice: record.referencePrice,
  finalPrice: record.finalPrice,
  highInWindow: record.highInWindow,
  lowInWindow: record.lowInWindow,
  absoluteMove: record.absoluteMove,
  percentageMove: record.percentageMove,
  maxFavorableExcursion: record.maxFavorableExcursion,
  maxAdverseExcursion: record.maxAdverseExcursion,
  evaluatedAt: record.evaluatedAtUtc,
  ...(record.notes ? { notes: record.notes } : {}),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc
});

export const dehydrateEvaluationResultToDurableRecord = (
  result: EvaluationResult,
  metadata: ProductRecordMetadata,
  version: number
): EvaluationResultDurableRecord => ({
  storageSchemaVersion: SIGNAL_EVALUATION_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "evaluation_result",
    entityId: result.id,
    version,
    relatedEntityIds: [result.signalCandidateId, result.evaluationWindowId]
  },
  lifecycleStatus: "active",
  createdAtUtc: result.createdAt,
  updatedAtUtc: result.updatedAt,
  archivedAtUtc: null,
  metadata: cloneMetadata(metadata),
  evaluationStatus: result.status,
  signalCandidateId: result.signalCandidateId,
  evaluationWindowId: result.evaluationWindowId,
  referencePrice: result.referencePrice,
  finalPrice: result.finalPrice,
  highInWindow: result.highInWindow,
  lowInWindow: result.lowInWindow,
  absoluteMove: result.absoluteMove,
  percentageMove: result.percentageMove,
  maxFavorableExcursion: result.maxFavorableExcursion,
  maxAdverseExcursion: result.maxAdverseExcursion,
  evaluatedAtUtc: result.evaluatedAt,
  notes: result.notes ?? null
});
