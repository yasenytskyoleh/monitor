import type { SetupDefinitionRevision } from "../review/setup-definition-revision.js";
import type { SetupDefinitionRevisionDurableRecord } from "../storage/setup-definition-revision-relational-slice.js";
import type {
  SetupDefinitionRevisionCreateRequest,
  SetupDefinitionRevisionRepository,
  SetupDefinitionRevisionStatusUpdateRequest
} from "./setup-definition-revision-repository.js";
import type { SetupDefinitionRevisionRelationalRepositoryAdapter } from "./setup-definition-revision-relational-repository-adapter.js";
import {
  dehydrateSetupDefinitionRevisionToDurableRecord,
  hydrateSetupDefinitionRevisionFromDurableRecord
} from "./setup-definition-revision-relational-repository-mappers.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const hydrateRevisions = (
  records: SetupDefinitionRevisionDurableRecord[]
): SetupDefinitionRevision[] =>
  records.map((record) => hydrateSetupDefinitionRevisionFromDurableRecord(record));

const buildNextRevisionRecord = (
  revision: SetupDefinitionRevision,
  metadata:
    | SetupDefinitionRevisionCreateRequest["metadata"]
    | SetupDefinitionRevisionStatusUpdateRequest["metadata"],
  currentRecord: SetupDefinitionRevisionDurableRecord
): SetupDefinitionRevisionDurableRecord =>
  dehydrateSetupDefinitionRevisionToDurableRecord(
    revision,
    metadata,
    currentRecord.identity.version + 1
  );

export class RelationalSetupDefinitionRevisionRepository
  implements SetupDefinitionRevisionRepository
{
  constructor(
    private readonly adapter: SetupDefinitionRevisionRelationalRepositoryAdapter
  ) {}

  async getById(setupDefinitionRevisionId: string): Promise<SetupDefinitionRevision | null> {
    const record = await this.adapter.loadSetupDefinitionRevisionRecord(
      setupDefinitionRevisionId
    );
    return record ? hydrateSetupDefinitionRevisionFromDurableRecord(record) : null;
  }

  async getBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupDefinitionRevision | null> {
    const record =
      await this.adapter.loadSetupDefinitionRevisionRecordBySetupDefinitionId(
        setupDefinitionId
      );
    return record ? hydrateSetupDefinitionRevisionFromDurableRecord(record) : null;
  }

  async getLatestBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevision | null> {
    const record =
      await this.adapter.loadLatestSetupDefinitionRevisionRecordBySetupFamilyId(
        setupFamilyId
      );
    return record ? hydrateSetupDefinitionRevisionFromDurableRecord(record) : null;
  }

  async listBySetupFamilyId(setupFamilyId: string): Promise<SetupDefinitionRevision[]> {
    const records =
      await this.adapter.listSetupDefinitionRevisionRecordsBySetupFamilyId(
        setupFamilyId
      );
    return hydrateRevisions(records);
  }

  async create(request: SetupDefinitionRevisionCreateRequest): Promise<SetupDefinitionRevision> {
    const record = await this.adapter.insertSetupDefinitionRevisionRecord({
      record: dehydrateSetupDefinitionRevisionToDurableRecord(
        request.revision,
        request.metadata,
        1
      ),
      expectedVersion: null
    });

    return hydrateSetupDefinitionRevisionFromDurableRecord(record);
  }

  async updateStatus(
    request: SetupDefinitionRevisionStatusUpdateRequest
  ): Promise<SetupDefinitionRevision | null> {
    const currentRecord = await this.adapter.loadSetupDefinitionRevisionRecord(
      request.setupDefinitionRevisionId
    );
    if (!currentRecord) {
      return null;
    }

    const currentRevision =
      hydrateSetupDefinitionRevisionFromDurableRecord(currentRecord);
    const updatedRecord = await this.adapter.updateSetupDefinitionRevisionRecord({
      record: buildNextRevisionRecord(
        {
          ...currentRevision,
          revisionStatus: request.status,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentRecord
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateSetupDefinitionRevisionFromDurableRecord(updatedRecord);
  }
}
