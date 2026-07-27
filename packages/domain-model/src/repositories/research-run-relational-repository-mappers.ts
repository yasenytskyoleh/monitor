import type { ResearchRun } from "../research-run.js";
import {
  DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS,
  type ResearchRunDurableRecord
} from "../storage/index.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

const schemaVersion = DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS[0];

export const hydrateResearchRunFromDurableRecord = (
  record: ResearchRunDurableRecord
): ResearchRun => ({
  runId: record.identity.entityId,
  hypothesisId: record.hypothesisId,
  setupId: record.setupId,
  candidateIds: structuredClone(record.candidateIds),
  evaluationWindowIds: structuredClone(record.evaluationWindowIds),
  evaluationResultIds: structuredClone(record.evaluationResultIds),
  status: record.researchRunStatus,
  startedAtUtc: record.startedAtUtc,
  ...(record.completedAtUtc ? { completedAtUtc: record.completedAtUtc } : {}),
  ...(record.summary ? { summary: record.summary } : {}),
  createdAtUtc: record.createdAtUtc,
  updatedAtUtc: record.updatedAtUtc
});

export const dehydrateResearchRunToDurableRecord = (
  run: ResearchRun,
  metadata: ProductRecordMetadata,
  version: number
): ResearchRunDurableRecord => ({
  storageSchemaVersion: schemaVersion,
  identity: {
    boundary: "product_domain",
    entityType: "research_run",
    entityId: run.runId,
    version,
    relatedEntityIds: [
      run.hypothesisId,
      run.setupId,
      ...run.candidateIds,
      ...run.evaluationResultIds
    ]
  },
  lifecycleStatus: "active",
  createdAtUtc: run.createdAtUtc,
  updatedAtUtc: run.updatedAtUtc,
  archivedAtUtc: null,
  metadata: structuredClone(metadata),
  researchRunStatus: run.status,
  hypothesisId: run.hypothesisId,
  setupId: run.setupId,
  candidateIds: structuredClone(run.candidateIds),
  evaluationWindowIds: structuredClone(run.evaluationWindowIds),
  evaluationResultIds: structuredClone(run.evaluationResultIds),
  startedAtUtc: run.startedAtUtc,
  completedAtUtc: run.completedAtUtc ?? null,
  summary: run.summary ?? null
});
