import type {
  RoutedActionExecutionEnvelopeCreateRequest,
  RoutedActionExecutionEnvelopeRepository
} from "./routed-action-execution-envelope-repository.js";
import type { RoutedActionExecutionEnvelope } from "../execution/routed-action-execution-envelope.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedRoutedActionExecutionEnvelopeRecord = {
  envelope: RoutedActionExecutionEnvelope;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneEnvelope = (envelope: RoutedActionExecutionEnvelope): RoutedActionExecutionEnvelope =>
  structuredClone(envelope);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export class InMemoryRoutedActionExecutionEnvelopeRepository
implements RoutedActionExecutionEnvelopeRepository {
  private readonly recordsById = new Map<string, PersistedRoutedActionExecutionEnvelopeRecord>();

  async getById(routedActionExecutionEnvelopeId: string): Promise<RoutedActionExecutionEnvelope | null> {
    const record = this.recordsById.get(routedActionExecutionEnvelopeId);
    return record ? cloneEnvelope(record.envelope) : null;
  }

  async listByReviewDecisionId(researchReviewDecisionId: string): Promise<RoutedActionExecutionEnvelope[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.envelope.sourceReviewDecisionId === researchReviewDecisionId)
      .map((record) => cloneEnvelope(record.envelope));
  }

  async create(request: RoutedActionExecutionEnvelopeCreateRequest): Promise<RoutedActionExecutionEnvelope> {
    const envelopeId = request.envelope.id;
    if (this.recordsById.has(envelopeId)) {
      throw new Error(`routed_action_execution_envelope already exists: ${envelopeId}`);
    }

    const envelope = cloneEnvelope(request.envelope);
    this.recordsById.set(envelopeId, {
      envelope,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneEnvelope(envelope);
  }
}
