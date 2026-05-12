import type { TimestampUtc } from "../common.js";
import type { ResearchHypothesisStatus } from "../research-hypothesis.js";
import type { HypothesisEvidenceStatus } from "../research/research-hypothesis-link.js";
import type { SetupDefinitionStatus, SetupDefinitionTraceMetadata } from "../setup-definition.js";
import type { ProductEntityIdentity } from "./entity-identity.js";
import type { PersistedEntity } from "./persisted-entity.js";

export const DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS = [
  "product_domain.relational.v1"
] as const;
export type DurableRelationalStorageSchemaVersion =
  (typeof DURABLE_RELATIONAL_STORAGE_SCHEMA_VERSIONS)[number];

export const FIRST_DURABLE_RELATIONAL_ENTITY_TYPES = [
  "setup_definition",
  "research_hypothesis"
] as const;
export type FirstDurableRelationalEntityType =
  (typeof FIRST_DURABLE_RELATIONAL_ENTITY_TYPES)[number];

type FirstDurableRelationalIdentity<TEntityType extends FirstDurableRelationalEntityType> =
  ProductEntityIdentity & {
    boundary: "product_domain";
    entityType: TEntityType;
    version: number;
  };

export type DurableRelationalRecordBase<TEntityType extends FirstDurableRelationalEntityType> =
  Omit<PersistedEntity, "identity"> & {
    identity: FirstDurableRelationalIdentity<TEntityType>;
    storageSchemaVersion: DurableRelationalStorageSchemaVersion;
    archivedAtUtc: TimestampUtc | null;
  };

export type SetupDefinitionDurableRecord = DurableRelationalRecordBase<"setup_definition"> & {
  definitionStatus: SetupDefinitionStatus;
  name: string;
  description: string;
  measurableConditions: string[];
  evaluationAssumptions: string[];
  invalidationAssumptions: string[];
  traceMetadata: SetupDefinitionTraceMetadata | null;
};

export type ResearchHypothesisDurableRecord =
  DurableRelationalRecordBase<"research_hypothesis"> & {
    hypothesisStatus: ResearchHypothesisStatus;
    title: string;
    description: string;
    assumptions: string[];
    notes: string[];
    evidenceStatus: HypothesisEvidenceStatus | null;
    evidenceSummary: string | null;
    lastEvidenceAggregateResultId: string | null;
    lastEvidenceAssessedAt: TimestampUtc | null;
  };

export type ResearchHypothesisSetupDefinitionLinkRecord = {
  storageSchemaVersion: DurableRelationalStorageSchemaVersion;
  researchHypothesisId: string;
  setupDefinitionId: string;
  linkedAtUtc: TimestampUtc;
};

export type FirstDurableRelationalRecord =
  | SetupDefinitionDurableRecord
  | ResearchHypothesisDurableRecord;
