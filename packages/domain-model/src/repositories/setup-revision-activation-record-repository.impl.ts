import type {
  SetupRevisionActivationRecordCreateRequest,
  SetupRevisionActivationRecordRepository
} from "./setup-revision-activation-record-repository.js";
import type { SetupRevisionActivationRecord } from "../review/setup-revision-activation-record.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedSetupRevisionActivationRecord = {
  activation: SetupRevisionActivationRecord;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneActivation = (
  activation: SetupRevisionActivationRecord
): SetupRevisionActivationRecord => structuredClone(activation);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

export class InMemorySetupRevisionActivationRecordRepository
implements SetupRevisionActivationRecordRepository {
  private readonly recordsById = new Map<string, PersistedSetupRevisionActivationRecord>();

  async getById(setupRevisionActivationRecordId: string): Promise<SetupRevisionActivationRecord | null> {
    const record = this.recordsById.get(setupRevisionActivationRecordId);
    return record ? cloneActivation(record.activation) : null;
  }

  async listBySetupFamilyId(setupFamilyId: string): Promise<SetupRevisionActivationRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.activation.setupFamilyId === setupFamilyId)
      .map((record) => cloneActivation(record.activation));
  }

  async listByTargetRevisionId(targetRevisionId: string): Promise<SetupRevisionActivationRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.activation.targetRevisionId === targetRevisionId)
      .map((record) => cloneActivation(record.activation));
  }

  async create(
    request: SetupRevisionActivationRecordCreateRequest
  ): Promise<SetupRevisionActivationRecord> {
    const setupRevisionActivationRecordId = request.activation.id;
    if (this.recordsById.has(setupRevisionActivationRecordId)) {
      throw new Error(
        `setup_revision_activation_record already exists: ${setupRevisionActivationRecordId}`
      );
    }

    const activation = cloneActivation(request.activation);
    this.recordsById.set(setupRevisionActivationRecordId, {
      activation,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneActivation(activation);
  }
}
