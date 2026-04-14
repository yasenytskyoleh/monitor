import type {
  SetupLifecycleMutationRecordCreateRequest,
  SetupLifecycleMutationRecordRepository
} from "./setup-lifecycle-mutation-record-repository.js";
import type { SetupLifecycleMutationRecord } from "../review/setup-lifecycle-mutation-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedSetupLifecycleMutationRecord = {
  mutation: SetupLifecycleMutationRecord;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneMutation = (mutation: SetupLifecycleMutationRecord): SetupLifecycleMutationRecord =>
  structuredClone(mutation);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

export class InMemorySetupLifecycleMutationRecordRepository
implements SetupLifecycleMutationRecordRepository {
  private readonly recordsById = new Map<string, PersistedSetupLifecycleMutationRecord>();

  async getById(setupLifecycleMutationRecordId: string): Promise<SetupLifecycleMutationRecord | null> {
    const record = this.recordsById.get(setupLifecycleMutationRecordId);
    return record ? cloneMutation(record.mutation) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupLifecycleMutationRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.mutation.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneMutation(record.mutation));
  }

  async listByApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupLifecycleMutationRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.mutation.researchDecisionApprovalId === researchDecisionApprovalId)
      .map((record) => cloneMutation(record.mutation));
  }

  async create(
    request: SetupLifecycleMutationRecordCreateRequest
  ): Promise<SetupLifecycleMutationRecord> {
    const setupLifecycleMutationRecordId = request.mutation.id;
    if (this.recordsById.has(setupLifecycleMutationRecordId)) {
      throw new Error(
        `setup_lifecycle_mutation_record already exists: ${setupLifecycleMutationRecordId}`
      );
    }

    const mutation = cloneMutation(request.mutation);
    this.recordsById.set(setupLifecycleMutationRecordId, {
      mutation,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneMutation(mutation);
  }
}
