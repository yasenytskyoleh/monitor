import type {
  ResearchDecisionApprovalCreateRequest,
  ResearchDecisionApprovalRepository
} from "./research-decision-approval-repository.js";
import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

type PersistedResearchDecisionApprovalRecord = {
  approval: ResearchDecisionApproval;
  version: number;
  metadata: ProductRecordMetadata;
};

const cloneApproval = (approval: ResearchDecisionApproval): ResearchDecisionApproval =>
  structuredClone(approval);

const cloneMetadata = (metadata: ProductRecordMetadata): ProductRecordMetadata => structuredClone(metadata);

export class InMemoryResearchDecisionApprovalRepository
implements ResearchDecisionApprovalRepository {
  private readonly recordsById = new Map<string, PersistedResearchDecisionApprovalRecord>();

  async getById(researchDecisionApprovalId: string): Promise<ResearchDecisionApproval | null> {
    const record = this.recordsById.get(researchDecisionApprovalId);
    return record ? cloneApproval(record.approval) : null;
  }

  async listByFeedbackDecisionId(
    researchFeedbackDecisionId: string
  ): Promise<ResearchDecisionApproval[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.approval.researchFeedbackDecisionId === researchFeedbackDecisionId)
      .map((record) => cloneApproval(record.approval));
  }

  async create(request: ResearchDecisionApprovalCreateRequest): Promise<ResearchDecisionApproval> {
    const researchDecisionApprovalId = request.approval.id;
    if (this.recordsById.has(researchDecisionApprovalId)) {
      throw new Error(`research_decision_approval already exists: ${researchDecisionApprovalId}`);
    }

    const approval = cloneApproval(request.approval);
    this.recordsById.set(researchDecisionApprovalId, {
      approval,
      version: 1,
      metadata: cloneMetadata(request.metadata)
    });

    return cloneApproval(approval);
  }
}
