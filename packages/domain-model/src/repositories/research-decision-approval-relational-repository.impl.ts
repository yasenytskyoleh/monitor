import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import type {
  ResearchDecisionApprovalCreateRequest,
  ResearchDecisionApprovalRepository
} from "./research-decision-approval-repository.js";
import type { ResearchDecisionApprovalRelationalRepositoryAdapter } from "./research-decision-approval-relational-repository-adapter.js";
import {
  dehydrateResearchDecisionApprovalToDurableRecord,
  hydrateResearchDecisionApprovalFromDurableRecord
} from "./research-decision-approval-relational-repository-mappers.js";

const hydrateApprovals = (
  records: ResearchDecisionApprovalDurableRecord[]
): ResearchDecisionApproval[] =>
  records.map((record) => hydrateResearchDecisionApprovalFromDurableRecord(record));

export class RelationalResearchDecisionApprovalRepository
  implements ResearchDecisionApprovalRepository
{
  constructor(private readonly adapter: ResearchDecisionApprovalRelationalRepositoryAdapter) {}

  async getById(researchDecisionApprovalId: string): Promise<ResearchDecisionApproval | null> {
    const record = await this.adapter.loadResearchDecisionApprovalRecord(researchDecisionApprovalId);
    return record ? hydrateResearchDecisionApprovalFromDurableRecord(record) : null;
  }

  async listByFeedbackDecisionId(
    researchFeedbackDecisionId: string
  ): Promise<ResearchDecisionApproval[]> {
    const records =
      await this.adapter.listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId(
        researchFeedbackDecisionId
      );
    return hydrateApprovals(records);
  }

  async create(request: ResearchDecisionApprovalCreateRequest): Promise<ResearchDecisionApproval> {
    const record = await this.adapter.insertResearchDecisionApprovalRecord({
      record: dehydrateResearchDecisionApprovalToDurableRecord(
        request.approval,
        request.metadata,
        1
      )
    });

    return hydrateResearchDecisionApprovalFromDurableRecord(record);
  }
}
