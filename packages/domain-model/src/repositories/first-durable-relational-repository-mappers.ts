import type { ResearchHypothesis } from "../research-hypothesis.js";
import type { SetupDefinition, SetupDefinitionTraceMetadata } from "../setup-definition.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ResearchHypothesisDurableRecord,
  type ResearchHypothesisSetupDefinitionLinkRecord,
  type SetupDefinitionDurableRecord
} from "../storage/first-durable-relational-slice.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ResearchHypothesisDurableRecordBundle } from "./first-durable-relational-repository-adapter.js";

const FIRST_DURABLE_SCHEMA_VERSION = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const cloneTraceMetadata = (
  traceMetadata: SetupDefinitionTraceMetadata | undefined
): SetupDefinitionTraceMetadata | null => (traceMetadata ? structuredClone(traceMetadata) : null);

const cloneStringArray = (values: string[]): string[] => [...values];

const normalizeRelatedSetupDefinitionIds = (setupDefinitionIds: string[]): string[] =>
  [...new Set(setupDefinitionIds.map((setupDefinitionId) => setupDefinitionId.trim()).filter(Boolean))];

const buildSetupDefinitionLifecycleStatus = (
  status: SetupDefinition["status"]
): SetupDefinitionDurableRecord["lifecycleStatus"] => (status === "archived" ? "archived" : "active");

const buildSetupDefinitionArchivedAtUtc = (
  definition: SetupDefinition
): SetupDefinitionDurableRecord["archivedAtUtc"] =>
  definition.status === "archived" ? definition.updatedAt : null;

export const hydrateSetupDefinitionFromDurableRecord = (
  record: SetupDefinitionDurableRecord
): SetupDefinition => ({
  id: record.identity.entityId,
  name: record.name,
  description: record.description,
  status: record.definitionStatus,
  measurableConditions: cloneStringArray(record.measurableConditions),
  evaluationAssumptions: cloneStringArray(record.evaluationAssumptions),
  invalidationAssumptions: cloneStringArray(record.invalidationAssumptions),
  createdAt: record.createdAtUtc,
  updatedAt: record.updatedAtUtc,
  ...(record.traceMetadata ? { traceMetadata: structuredClone(record.traceMetadata) } : {})
});

export const dehydrateSetupDefinitionToDurableRecord = (
  definition: SetupDefinition,
  metadata: ProductRecordMetadata,
  version: number
): SetupDefinitionDurableRecord => ({
  storageSchemaVersion: FIRST_DURABLE_SCHEMA_VERSION,
  identity: {
    boundary: "product_domain",
    entityType: "setup_definition",
    entityId: definition.id,
    version,
    relatedEntityIds: []
  },
  lifecycleStatus: buildSetupDefinitionLifecycleStatus(definition.status),
  createdAtUtc: definition.createdAt,
  updatedAtUtc: definition.updatedAt,
  archivedAtUtc: buildSetupDefinitionArchivedAtUtc(definition),
  metadata: cloneMetadata(metadata),
  definitionStatus: definition.status,
  name: definition.name,
  description: definition.description,
  measurableConditions: cloneStringArray(definition.measurableConditions),
  evaluationAssumptions: cloneStringArray(definition.evaluationAssumptions),
  invalidationAssumptions: cloneStringArray(definition.invalidationAssumptions),
  traceMetadata: cloneTraceMetadata(definition.traceMetadata)
});

const buildHydratedRelatedSetupDefinitionIds = (
  bundle: ResearchHypothesisDurableRecordBundle
): string[] => {
  const linkIds = normalizeRelatedSetupDefinitionIds(
    bundle.setupDefinitionLinkRecords.map((linkRecord) => linkRecord.setupDefinitionId)
  );
  return linkIds.length > 0
    ? linkIds
    : normalizeRelatedSetupDefinitionIds(bundle.hypothesisRecord.identity.relatedEntityIds);
};

export const hydrateResearchHypothesisFromDurableBundle = (
  bundle: ResearchHypothesisDurableRecordBundle
): ResearchHypothesis => {
  const { hypothesisRecord } = bundle;

  return {
    id: hypothesisRecord.identity.entityId,
    title: hypothesisRecord.title,
    description: hypothesisRecord.description,
    relatedSetupDefinitionIds: buildHydratedRelatedSetupDefinitionIds(bundle),
    assumptions: cloneStringArray(hypothesisRecord.assumptions),
    notes: cloneStringArray(hypothesisRecord.notes),
    status: hypothesisRecord.hypothesisStatus,
    createdAt: hypothesisRecord.createdAtUtc,
    updatedAt: hypothesisRecord.updatedAtUtc,
    ...(hypothesisRecord.evidenceStatus ? { evidenceStatus: hypothesisRecord.evidenceStatus } : {}),
    ...(hypothesisRecord.evidenceSummary
      ? { evidenceSummary: hypothesisRecord.evidenceSummary }
      : {}),
    ...(hypothesisRecord.lastEvidenceAggregateResultId
      ? { lastEvidenceAggregateResultId: hypothesisRecord.lastEvidenceAggregateResultId }
      : {}),
    ...(hypothesisRecord.lastEvidenceAssessedAt
      ? { lastEvidenceAssessedAt: hypothesisRecord.lastEvidenceAssessedAt }
      : {})
  };
};

export const dehydrateResearchHypothesisToDurableBundle = (
  hypothesis: ResearchHypothesis,
  metadata: ProductRecordMetadata,
  version: number
): ResearchHypothesisDurableRecordBundle => {
  const relatedSetupDefinitionIds = normalizeRelatedSetupDefinitionIds(
    hypothesis.relatedSetupDefinitionIds
  );
  const hypothesisRecord: ResearchHypothesisDurableRecord = {
    storageSchemaVersion: FIRST_DURABLE_SCHEMA_VERSION,
    identity: {
      boundary: "product_domain",
      entityType: "research_hypothesis",
      entityId: hypothesis.id,
      version,
      relatedEntityIds: relatedSetupDefinitionIds
    },
    lifecycleStatus: "active",
    createdAtUtc: hypothesis.createdAt,
    updatedAtUtc: hypothesis.updatedAt,
    archivedAtUtc: null,
    metadata: cloneMetadata(metadata),
    hypothesisStatus: hypothesis.status,
    title: hypothesis.title,
    description: hypothesis.description,
    assumptions: cloneStringArray(hypothesis.assumptions),
    notes: cloneStringArray(hypothesis.notes),
    evidenceStatus: hypothesis.evidenceStatus ?? null,
    evidenceSummary: hypothesis.evidenceSummary ?? null,
    lastEvidenceAggregateResultId: hypothesis.lastEvidenceAggregateResultId ?? null,
    lastEvidenceAssessedAt: hypothesis.lastEvidenceAssessedAt ?? null
  };
  const setupDefinitionLinkRecords: ResearchHypothesisSetupDefinitionLinkRecord[] =
    relatedSetupDefinitionIds.map((setupDefinitionId) => ({
      storageSchemaVersion: FIRST_DURABLE_SCHEMA_VERSION,
      researchHypothesisId: hypothesis.id,
      setupDefinitionId,
      linkedAtUtc: hypothesis.updatedAt
    }));

  return {
    hypothesisRecord,
    setupDefinitionLinkRecords
  };
};
