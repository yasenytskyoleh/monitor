import type { SetupRevisionActivationRecord } from "../review/setup-revision-activation-record.js";
import type { SetupRevisionActivationRecordDurableRecord } from "../storage/setup-revision-activation-record-relational-slice.js";
import type {
  SetupRevisionActivationRecordCreateRequest,
  SetupRevisionActivationRecordRepository
} from "./setup-revision-activation-record-repository.js";
import type { SetupRevisionActivationRecordRelationalRepositoryAdapter } from "./setup-revision-activation-record-relational-repository-adapter.js";
import {
  dehydrateSetupRevisionActivationRecordToDurableRecord,
  hydrateSetupRevisionActivationRecordFromDurableRecord
} from "./setup-revision-activation-record-relational-repository-mappers.js";

const hydrateActivationRecords = (
  records: SetupRevisionActivationRecordDurableRecord[]
): SetupRevisionActivationRecord[] =>
  records.map((record) => hydrateSetupRevisionActivationRecordFromDurableRecord(record));

export class RelationalSetupRevisionActivationRecordRepository
  implements SetupRevisionActivationRecordRepository
{
  constructor(
    private readonly adapter: SetupRevisionActivationRecordRelationalRepositoryAdapter
  ) {}

  async getById(
    setupRevisionActivationRecordId: string
  ): Promise<SetupRevisionActivationRecord | null> {
    const record = await this.adapter.loadSetupRevisionActivationRecord(
      setupRevisionActivationRecordId
    );
    return record ? hydrateSetupRevisionActivationRecordFromDurableRecord(record) : null;
  }

  async listBySetupFamilyId(setupFamilyId: string): Promise<SetupRevisionActivationRecord[]> {
    const records =
      await this.adapter.listSetupRevisionActivationRecordsBySetupFamilyId(
        setupFamilyId
      );
    return hydrateActivationRecords(records);
  }

  async listByTargetRevisionId(
    targetRevisionId: string
  ): Promise<SetupRevisionActivationRecord[]> {
    const records =
      await this.adapter.listSetupRevisionActivationRecordsByTargetRevisionId(
        targetRevisionId
      );
    return hydrateActivationRecords(records);
  }

  async create(
    request: SetupRevisionActivationRecordCreateRequest
  ): Promise<SetupRevisionActivationRecord> {
    const record = await this.adapter.insertSetupRevisionActivationRecord({
      record: dehydrateSetupRevisionActivationRecordToDurableRecord(
        request.activation,
        request.metadata,
        1
      )
    });

    return hydrateSetupRevisionActivationRecordFromDurableRecord(record);
  }
}
