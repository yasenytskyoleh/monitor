import type {
  SetupDefinitionRevisionCreateRequest,
  SetupDefinitionRevisionRepository,
  SetupDefinitionRevisionStatusUpdateRequest
} from "./setup-definition-revision-repository.js";
import type { SetupDefinitionRevision } from "../review/setup-definition-revision.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedSetupDefinitionRevisionRecord = {
  revision: SetupDefinitionRevision;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneRevision = (revision: SetupDefinitionRevision): SetupDefinitionRevision =>
  structuredClone(revision);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

const assertExpectedVersion = (
  record: PersistedSetupDefinitionRevisionRecord,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== record.version) {
    throw new Error(
      `setup_definition_revision version mismatch: expected ${expectedVersion}, got ${record.version}`
    );
  }
};

const buildUpdatedTimestamp = (metadata: ProductRecordMetadata): string =>
  metadata.sourceObservedAtUtc ?? new Date().toISOString();

export class InMemorySetupDefinitionRevisionRepository
implements SetupDefinitionRevisionRepository {
  private readonly recordsById = new Map<string, PersistedSetupDefinitionRevisionRecord>();

  async getById(setupDefinitionRevisionId: string): Promise<SetupDefinitionRevision | null> {
    const record = this.recordsById.get(setupDefinitionRevisionId);
    return record ? cloneRevision(record.revision) : null;
  }

  async getBySetupDefinitionId(setupDefinitionId: string): Promise<SetupDefinitionRevision | null> {
    const record = [...this.recordsById.values()].find(
      (entry) => entry.revision.setupDefinitionId === setupDefinitionId
    );
    return record ? cloneRevision(record.revision) : null;
  }

  async getLatestBySetupFamilyId(setupFamilyId: string): Promise<SetupDefinitionRevision | null> {
    const revisions = [...this.recordsById.values()]
      .map((record) => record.revision)
      .filter((revision) => revision.versionInfo.setupFamilyId === setupFamilyId)
      .sort((a, b) => b.versionInfo.version - a.versionInfo.version);

    return revisions[0] ? cloneRevision(revisions[0]) : null;
  }

  async listBySetupFamilyId(setupFamilyId: string): Promise<SetupDefinitionRevision[]> {
    return [...this.recordsById.values()]
      .map((record) => record.revision)
      .filter((revision) => revision.versionInfo.setupFamilyId === setupFamilyId)
      .sort((a, b) => a.versionInfo.version - b.versionInfo.version)
      .map((revision) => cloneRevision(revision));
  }

  async create(request: SetupDefinitionRevisionCreateRequest): Promise<SetupDefinitionRevision> {
    const setupDefinitionRevisionId = request.revision.id;
    if (this.recordsById.has(setupDefinitionRevisionId)) {
      throw new Error(`setup_definition_revision already exists: ${setupDefinitionRevisionId}`);
    }

    if (request.revision.versionInfo.version <= 0) {
      throw new Error("setup_definition_revision version must be a positive integer");
    }

    const latest = await this.getLatestBySetupFamilyId(request.revision.versionInfo.setupFamilyId);
    if (latest && request.revision.versionInfo.version <= latest.versionInfo.version) {
      throw new Error(
        `setup_definition_revision version must increment for family ${request.revision.versionInfo.setupFamilyId}`
      );
    }

    const revision = cloneRevision(request.revision);
    this.recordsById.set(setupDefinitionRevisionId, {
      revision,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneRevision(revision);
  }

  async updateStatus(
    request: SetupDefinitionRevisionStatusUpdateRequest
  ): Promise<SetupDefinitionRevision | null> {
    const currentRecord = this.recordsById.get(request.setupDefinitionRevisionId);
    if (!currentRecord) {
      return null;
    }

    assertExpectedVersion(currentRecord, request.expectedVersion);

    const revision: SetupDefinitionRevision = {
      ...currentRecord.revision,
      revisionStatus: request.status,
      updatedAt: buildUpdatedTimestamp(request.metadata)
    };

    this.recordsById.set(request.setupDefinitionRevisionId, {
      revision,
      version: currentRecord.version + 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneRevision(revision);
  }
}
