import type {
  ResearchReviewDecisionCreateRequest,
  ResearchReviewDecisionRepository
} from "./research-review-decision-repository.js";
import type { ResearchReviewDecision } from "../review/research-review-decision.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedResearchReviewDecisionRecord = {
  decision: ResearchReviewDecision;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneDecision = (decision: ResearchReviewDecision): ResearchReviewDecision =>
  structuredClone(decision);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata =>
  structuredClone(metadata);

export class InMemoryResearchReviewDecisionRepository
implements ResearchReviewDecisionRepository {
  private readonly recordsById = new Map<string, PersistedResearchReviewDecisionRecord>();

  async getById(researchReviewDecisionId: string): Promise<ResearchReviewDecision | null> {
    const record = this.recordsById.get(researchReviewDecisionId);
    return record ? cloneDecision(record.decision) : null;
  }

  async listByReviewPacketId(researchReviewPacketId: string): Promise<ResearchReviewDecision[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.decision.researchReviewPacketId === researchReviewPacketId)
      .map((record) => cloneDecision(record.decision));
  }

  async listBySetupFamilyId(setupFamilyId: string): Promise<ResearchReviewDecision[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.decision.setupFamilyId === setupFamilyId)
      .map((record) => cloneDecision(record.decision));
  }

  async create(request: ResearchReviewDecisionCreateRequest): Promise<ResearchReviewDecision> {
    const researchReviewDecisionId = request.decision.id;
    if (this.recordsById.has(researchReviewDecisionId)) {
      throw new Error(`research_review_decision already exists: ${researchReviewDecisionId}`);
    }

    const decision = cloneDecision(request.decision);
    this.recordsById.set(researchReviewDecisionId, {
      decision,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneDecision(decision);
  }
}
