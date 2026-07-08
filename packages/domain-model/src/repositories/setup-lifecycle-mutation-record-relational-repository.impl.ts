import type { SetupLifecycleMutationRecord } from "../review/setup-lifecycle-mutation-record.js";
import type { SetupLifecycleMutationRecordDurableRecord } from "../storage/setup-lifecycle-mutation-record-relational-slice.js";
import type {
  SetupLifecycleMutationRecordCreateRequest,
  SetupLifecycleMutationRecordRepository
} from "./setup-lifecycle-mutation-record-repository.js";
import type { SetupLifecycleMutationRecordRelationalRepositoryAdapter } from "./setup-lifecycle-mutation-record-relational-repository-adapter.js";
import {
  dehydrateSetupLifecycleMutationRecordToDurableRecord,
  hydrateSetupLifecycleMutationRecordFromDurableRecord
} from "./setup-lifecycle-mutation-record-relational-repository-mappers.js";

const hydrateMutations = (
  records: SetupLifecycleMutationRecordDurableRecord[]
): SetupLifecycleMutationRecord[] =>
  records.map((record) => hydrateSetupLifecycleMutationRecordFromDurableRecord(record));

export class RelationalSetupLifecycleMutationRecordRepository
  implements SetupLifecycleMutationRecordRepository
{
  constructor(
    private readonly adapter: SetupLifecycleMutationRecordRelationalRepositoryAdapter
  ) {}

  async getById(
    setupLifecycleMutationRecordId: string
  ): Promise<SetupLifecycleMutationRecord | null> {
    const record = await this.adapter.loadSetupLifecycleMutationRecord(
      setupLifecycleMutationRecordId
    );
    return record ? hydrateSetupLifecycleMutationRecordFromDurableRecord(record) : null;
  }

  async listBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupLifecycleMutationRecord[]> {
    const records = await this.adapter.listSetupLifecycleMutationRecordsBySetupDefinitionId(
      setupDefinitionId
    );
    return hydrateMutations(records);
  }

  async listByApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupLifecycleMutationRecord[]> {
    const records =
      await this.adapter.listSetupLifecycleMutationRecordsByResearchDecisionApprovalId(
        researchDecisionApprovalId
      );
    return hydrateMutations(records);
  }

  async create(
    request: SetupLifecycleMutationRecordCreateRequest
  ): Promise<SetupLifecycleMutationRecord> {
    const record = await this.adapter.insertSetupLifecycleMutationRecord({
      record: dehydrateSetupLifecycleMutationRecordToDurableRecord(
        request.mutation,
        request.metadata,
        1
      )
    });

    return hydrateSetupLifecycleMutationRecordFromDurableRecord(record);
  }
}
