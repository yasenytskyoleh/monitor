import type {
  SetupRefinementRequestCreateRequest,
  SetupRefinementRequestRepository
} from "./setup-refinement-request-repository.js";
import type { SetupRefinementRequest } from "../review/setup-refinement-request.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedSetupRefinementRequestRecord = {
  request: SetupRefinementRequest;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneRequest = (request: SetupRefinementRequest): SetupRefinementRequest =>
  structuredClone(request);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

export class InMemorySetupRefinementRequestRepository
implements SetupRefinementRequestRepository {
  private readonly recordsById = new Map<string, PersistedSetupRefinementRequestRecord>();

  async getById(setupRefinementRequestId: string): Promise<SetupRefinementRequest | null> {
    const record = this.recordsById.get(setupRefinementRequestId);
    return record ? cloneRequest(record.request) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<SetupRefinementRequest[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.request.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneRequest(record.request));
  }

  async listByApprovalId(researchDecisionApprovalId: string): Promise<SetupRefinementRequest[]> {
    return [...this.recordsById.values()]
      .filter(
        (record) => record.request.sourceResearchDecisionApprovalId === researchDecisionApprovalId
      )
      .map((record) => cloneRequest(record.request));
  }

  async create(request: SetupRefinementRequestCreateRequest): Promise<SetupRefinementRequest> {
    const setupRefinementRequestId = request.request.id;
    if (this.recordsById.has(setupRefinementRequestId)) {
      throw new Error(`setup_refinement_request already exists: ${setupRefinementRequestId}`);
    }

    const refinementRequest = cloneRequest(request.request);
    this.recordsById.set(setupRefinementRequestId, {
      request: refinementRequest,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneRequest(refinementRequest);
  }
}
