import type {
  ReviewDecisionRoutingResultCreateRequest,
  ReviewDecisionRoutingResultRepository
} from "./review-decision-routing-result-repository.js";
import type { ReviewDecisionRoutingResult } from "../review/review-decision-routing-result.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedReviewDecisionRoutingResultRecord = {
  result: ReviewDecisionRoutingResult;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneResult = (result: ReviewDecisionRoutingResult): ReviewDecisionRoutingResult =>
  structuredClone(result);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export class InMemoryReviewDecisionRoutingResultRepository
implements ReviewDecisionRoutingResultRepository {
  private readonly recordsById = new Map<string, PersistedReviewDecisionRoutingResultRecord>();

  async getById(reviewDecisionRoutingResultId: string): Promise<ReviewDecisionRoutingResult | null> {
    const record = this.recordsById.get(reviewDecisionRoutingResultId);
    return record ? cloneResult(record.result) : null;
  }

  async listByReviewDecisionId(researchReviewDecisionId: string): Promise<ReviewDecisionRoutingResult[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.result.researchReviewDecisionId === researchReviewDecisionId)
      .map((record) => cloneResult(record.result));
  }

  async create(request: ReviewDecisionRoutingResultCreateRequest): Promise<ReviewDecisionRoutingResult> {
    const routingResultId = request.result.routingId;
    if (!routingResultId) {
      throw new Error("review_decision_routing_result routingId is required");
    }

    if (this.recordsById.has(routingResultId)) {
      throw new Error(`review_decision_routing_result already exists: ${routingResultId}`);
    }

    const result = cloneResult(request.result);
    this.recordsById.set(routingResultId, {
      result,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneResult(result);
  }
}
