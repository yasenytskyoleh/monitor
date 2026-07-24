import type { ReviewDecisionRoutingResultRepository } from "./review-decision-routing-result-repository.js";
import type { ReviewDecisionRoutingResultRelationalRepositoryAdapter } from "./review-decision-routing-result-relational-repository-adapter.js";
import { RelationalReviewDecisionRoutingResultRepository } from "./review-decision-routing-result-relational-repository.impl.js";

export type ReviewDecisionRoutingResultRelationalRepositories = {
  reviewDecisionRoutingResultRepository: ReviewDecisionRoutingResultRepository;
};

export const composeReviewDecisionRoutingResultRelationalRepositories = (
  adapter: ReviewDecisionRoutingResultRelationalRepositoryAdapter
): ReviewDecisionRoutingResultRelationalRepositories => ({
  reviewDecisionRoutingResultRepository:
    new RelationalReviewDecisionRoutingResultRepository(adapter)
});
