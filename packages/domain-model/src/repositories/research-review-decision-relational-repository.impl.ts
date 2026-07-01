import type { ResearchReviewDecision } from "../review/research-review-decision.js";
import type { ResearchReviewDecisionDurableRecord } from "../storage/research-review-decision-relational-slice.js";
import type {
  ResearchReviewDecisionCreateRequest,
  ResearchReviewDecisionRepository
} from "./research-review-decision-repository.js";
import type { ResearchReviewDecisionRelationalRepositoryAdapter } from "./research-review-decision-relational-repository-adapter.js";
import {
  dehydrateResearchReviewDecisionToDurableRecord,
  hydrateResearchReviewDecisionFromDurableRecord
} from "./research-review-decision-relational-repository-mappers.js";

const hydrateDecisions = (
  records: ResearchReviewDecisionDurableRecord[]
): ResearchReviewDecision[] =>
  records.map((record) => hydrateResearchReviewDecisionFromDurableRecord(record));

export class RelationalResearchReviewDecisionRepository
  implements ResearchReviewDecisionRepository
{
  constructor(private readonly adapter: ResearchReviewDecisionRelationalRepositoryAdapter) {}

  async getById(researchReviewDecisionId: string): Promise<ResearchReviewDecision | null> {
    const record = await this.adapter.loadResearchReviewDecisionRecord(researchReviewDecisionId);
    return record ? hydrateResearchReviewDecisionFromDurableRecord(record) : null;
  }

  async listByReviewPacketId(
    researchReviewPacketId: string
  ): Promise<ResearchReviewDecision[]> {
    const records =
      await this.adapter.listResearchReviewDecisionRecordsByReviewPacketId(
        researchReviewPacketId
      );
    return hydrateDecisions(records);
  }

  async listBySetupFamilyId(setupFamilyId: string): Promise<ResearchReviewDecision[]> {
    const records =
      await this.adapter.listResearchReviewDecisionRecordsBySetupFamilyId(setupFamilyId);
    return hydrateDecisions(records);
  }

  async create(request: ResearchReviewDecisionCreateRequest): Promise<ResearchReviewDecision> {
    const record = await this.adapter.insertResearchReviewDecisionRecord({
      record: dehydrateResearchReviewDecisionToDurableRecord(
        request.decision,
        request.metadata,
        1
      )
    });

    return hydrateResearchReviewDecisionFromDurableRecord(record);
  }
}
