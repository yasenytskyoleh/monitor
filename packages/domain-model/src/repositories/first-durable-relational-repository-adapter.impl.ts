import type {
  ResearchHypothesisDurableRecord,
  ResearchHypothesisSetupDefinitionLinkRecord,
  SetupDefinitionDurableRecord
} from "../storage/first-durable-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  FirstDurableRelationalRepositoryAdapter,
  ResearchHypothesisBundleWriteRequest,
  ResearchHypothesisDurableRecordBundle,
  SetupDefinitionRecordWriteRequest
} from "./first-durable-relational-repository-adapter.js";

const cloneSetupDefinitionRecord = (
  record: SetupDefinitionDurableRecord
): SetupDefinitionDurableRecord => structuredClone(record);

const cloneResearchHypothesisBundle = (
  bundle: ResearchHypothesisDurableRecordBundle
): ResearchHypothesisDurableRecordBundle => structuredClone(bundle);

const assertExpectedVersion = (
  entityType: "setup_definition" | "research_hypothesis",
  entityId: string,
  currentVersion: number,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw createVersionMismatchRepositoryError({
      entityType,
      entityId,
      operation: "update",
      expectedVersion,
      actualVersion: currentVersion
    });
  }
};

export class InMemoryFirstDurableRelationalRepositoryAdapter
  implements FirstDurableRelationalRepositoryAdapter
{
  private readonly setupDefinitionRecordsById = new Map<string, SetupDefinitionDurableRecord>();
  private readonly researchHypothesisBundlesById = new Map<
    string,
    ResearchHypothesisDurableRecordBundle
  >();

  async loadSetupDefinitionRecord(
    setupDefinitionId: string
  ): Promise<SetupDefinitionDurableRecord | null> {
    const record = this.setupDefinitionRecordsById.get(setupDefinitionId);
    return record ? cloneSetupDefinitionRecord(record) : null;
  }

  async listSetupDefinitionRecordsByStatus(
    statuses: SetupDefinitionDurableRecord["definitionStatus"][]
  ): Promise<SetupDefinitionDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.setupDefinitionRecordsById.values()]
      .filter((record) => allowedStatuses.has(record.definitionStatus))
      .map((record) => cloneSetupDefinitionRecord(record));
  }

  async insertSetupDefinitionRecord(
    request: SetupDefinitionRecordWriteRequest
  ): Promise<SetupDefinitionDurableRecord> {
    const setupDefinitionId = request.record.identity.entityId;
    if (this.setupDefinitionRecordsById.has(setupDefinitionId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_definition",
        entityId: setupDefinitionId,
        operation: "create"
      });
    }

    const record = cloneSetupDefinitionRecord(request.record);
    this.setupDefinitionRecordsById.set(setupDefinitionId, record);
    return cloneSetupDefinitionRecord(record);
  }

  async updateSetupDefinitionRecord(
    request: SetupDefinitionRecordWriteRequest
  ): Promise<SetupDefinitionDurableRecord> {
    const setupDefinitionId = request.record.identity.entityId;
    const currentRecord = this.setupDefinitionRecordsById.get(setupDefinitionId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "setup_definition",
        entityId: setupDefinitionId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      "setup_definition",
      setupDefinitionId,
      currentRecord.identity.version,
      request.expectedVersion
    );

    const record = cloneSetupDefinitionRecord(request.record);
    this.setupDefinitionRecordsById.set(setupDefinitionId, record);
    return cloneSetupDefinitionRecord(record);
  }

  async loadResearchHypothesisBundle(
    researchHypothesisId: string
  ): Promise<ResearchHypothesisDurableRecordBundle | null> {
    const bundle = this.researchHypothesisBundlesById.get(researchHypothesisId);
    return bundle ? cloneResearchHypothesisBundle(bundle) : null;
  }

  async listResearchHypothesisBundlesByStatus(
    statuses: ResearchHypothesisDurableRecord["hypothesisStatus"][]
  ): Promise<ResearchHypothesisDurableRecordBundle[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.researchHypothesisBundlesById.values()]
      .filter((bundle) => allowedStatuses.has(bundle.hypothesisRecord.hypothesisStatus))
      .map((bundle) => cloneResearchHypothesisBundle(bundle));
  }

  async insertResearchHypothesisBundle(
    request: ResearchHypothesisBundleWriteRequest
  ): Promise<ResearchHypothesisDurableRecordBundle> {
    const researchHypothesisId = request.bundle.hypothesisRecord.identity.entityId;
    if (this.researchHypothesisBundlesById.has(researchHypothesisId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "research_hypothesis",
        entityId: researchHypothesisId,
        operation: "create"
      });
    }

    this.assertSetupDefinitionReferencesExist(request.bundle.setupDefinitionLinkRecords, "create");

    const bundle = cloneResearchHypothesisBundle(request.bundle);
    this.researchHypothesisBundlesById.set(researchHypothesisId, bundle);
    return cloneResearchHypothesisBundle(bundle);
  }

  async updateResearchHypothesisBundle(
    request: ResearchHypothesisBundleWriteRequest
  ): Promise<ResearchHypothesisDurableRecordBundle> {
    const researchHypothesisId = request.bundle.hypothesisRecord.identity.entityId;
    const currentBundle = this.researchHypothesisBundlesById.get(researchHypothesisId);
    if (!currentBundle) {
      throw createNotFoundRepositoryError({
        entityType: "research_hypothesis",
        entityId: researchHypothesisId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      "research_hypothesis",
      researchHypothesisId,
      currentBundle.hypothesisRecord.identity.version,
      request.expectedVersion
    );
    this.assertSetupDefinitionReferencesExist(request.bundle.setupDefinitionLinkRecords, "update");

    const bundle = cloneResearchHypothesisBundle(request.bundle);
    this.researchHypothesisBundlesById.set(researchHypothesisId, bundle);
    return cloneResearchHypothesisBundle(bundle);
  }

  private assertSetupDefinitionReferencesExist(
    linkRecords: ResearchHypothesisSetupDefinitionLinkRecord[],
    operation: "create" | "update"
  ): void {
    for (const linkRecord of linkRecords) {
      if (!this.setupDefinitionRecordsById.has(linkRecord.setupDefinitionId)) {
        throw createInvalidReferenceRepositoryError({
          entityType: "research_hypothesis",
          entityId: linkRecord.researchHypothesisId,
          operation,
          referenceEntityType: "setup_definition",
          referenceEntityId: linkRecord.setupDefinitionId
        });
      }
    }
  }
}
