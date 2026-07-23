import type { ReviewDecisionRoutingResult } from "../review/review-decision-routing-result.js";
import type { ReviewDecisionRoutingResultDurableRecord } from "../storage/review-decision-routing-result-relational-slice.js";
import type {
  ReviewDecisionRoutingResultCreateRequest,
  ReviewDecisionRoutingResultRepository
} from "./review-decision-routing-result-repository.js";
import type { ReviewDecisionRoutingResultRelationalRepositoryAdapter } from "./review-decision-routing-result-relational-repository-adapter.js";
import {
  dehydrateReviewDecisionRoutingResultToDurableRecord,
  hydrateReviewDecisionRoutingResultFromDurableRecord
} from "./review-decision-routing-result-relational-repository-mappers.js";

const hydrateRoutingResults = (
  records: ReviewDecisionRoutingResultDurableRecord[]
): ReviewDecisionRoutingResult[] =>
  records.map((record) => hydrateReviewDecisionRoutingResultFromDurableRecord(record));

export class RelationalReviewDecisionRoutingResultRepository
  implements ReviewDecisionRoutingResultRepository
{
  constructor(
    private readonly adapter: ReviewDecisionRoutingResultRelationalRepositoryAdapter
  ) {}

  async getById(
    reviewDecisionRoutingResultId: string
  ): Promise<ReviewDecisionRoutingResult | null> {
    const record = await this.adapter.loadReviewDecisionRoutingResultRecord(
      reviewDecisionRoutingResultId
    );
    return record ? hydrateReviewDecisionRoutingResultFromDurableRecord(record) : null;
  }

  async listByReviewDecisionId(
    researchReviewDecisionId: string
  ): Promise<ReviewDecisionRoutingResult[]> {
    const records =
      await this.adapter.listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId(
        researchReviewDecisionId
      );
    return hydrateRoutingResults(records);
  }

  async create(
    request: ReviewDecisionRoutingResultCreateRequest
  ): Promise<ReviewDecisionRoutingResult> {
    const record = await this.adapter.insertReviewDecisionRoutingResultRecord({
      record: dehydrateReviewDecisionRoutingResultToDurableRecord(
        request.result,
        request.metadata,
        1
      )
    });

    return hydrateReviewDecisionRoutingResultFromDurableRecord(record);
  }
}
