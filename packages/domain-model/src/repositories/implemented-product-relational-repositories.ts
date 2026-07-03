import type {
  FirstDurableRelationalRepositoryAdapter
} from "./first-durable-relational-repository-adapter.js";
import {
  composeFirstDurableRelationalRepositories,
  type FirstDurableRelationalRepositories
} from "./first-durable-relational-repositories.js";
import type {
  ResearchDecisionApprovalRelationalRepositoryAdapter
} from "./research-decision-approval-relational-repository-adapter.js";
import {
  composeResearchDecisionApprovalRelationalRepositories,
  type ResearchDecisionApprovalRelationalRepositories
} from "./research-decision-approval-relational-repositories.js";
import type {
  ResearchReviewDecisionRelationalRepositoryAdapter
} from "./research-review-decision-relational-repository-adapter.js";
import {
  composeResearchReviewDecisionRelationalRepositories,
  type ResearchReviewDecisionRelationalRepositories
} from "./research-review-decision-relational-repositories.js";
import type {
  RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
} from "./routed-action-execution-envelope-relational-repository-adapter.js";
import {
  composeRoutedActionExecutionEnvelopeRelationalRepositories,
  type RoutedActionExecutionEnvelopeRelationalRepositories
} from "./routed-action-execution-envelope-relational-repositories.js";
import {
  composeResearchFeedbackDecisionRelationalRepositories,
  type ResearchFeedbackDecisionRelationalRepositories
} from "./research-feedback-decision-relational-repositories.js";
import type {
  ResearchFeedbackDecisionRelationalRepositoryAdapter
} from "./research-feedback-decision-relational-repository-adapter.js";
import {
  composeSetupAggregateRelationalRepositories,
  type SetupAggregateRelationalRepositories
} from "./setup-aggregate-relational-repositories.js";
import type {
  SetupAggregateRelationalRepositoryAdapter
} from "./setup-aggregate-relational-repository-adapter.js";
import type {
  SignalEvaluationRelationalRepositoryAdapter
} from "./signal-evaluation-relational-repository-adapter.js";
import {
  composeSignalEvaluationRelationalRepositories,
  type SignalEvaluationRelationalRepositories
} from "./signal-evaluation-relational-repositories.js";

export type ImplementedProductRelationalAdapters = {
  firstDurableAdapter: FirstDurableRelationalRepositoryAdapter;
  signalEvaluationAdapter: SignalEvaluationRelationalRepositoryAdapter;
  setupAggregateAdapter: SetupAggregateRelationalRepositoryAdapter;
  feedbackDecisionAdapter: ResearchFeedbackDecisionRelationalRepositoryAdapter;
  approvalAdapter: ResearchDecisionApprovalRelationalRepositoryAdapter;
  reviewDecisionAdapter: ResearchReviewDecisionRelationalRepositoryAdapter;
  routedActionAdapter: RoutedActionExecutionEnvelopeRelationalRepositoryAdapter;
};

export type ImplementedProductRelationalRepositories =
  FirstDurableRelationalRepositories &
  SignalEvaluationRelationalRepositories &
  SetupAggregateRelationalRepositories &
  ResearchFeedbackDecisionRelationalRepositories &
  ResearchDecisionApprovalRelationalRepositories &
  ResearchReviewDecisionRelationalRepositories &
  RoutedActionExecutionEnvelopeRelationalRepositories;

export const composeImplementedProductRelationalRepositories = (
  adapters: ImplementedProductRelationalAdapters
): ImplementedProductRelationalRepositories => ({
  ...composeFirstDurableRelationalRepositories(adapters.firstDurableAdapter),
  ...composeSignalEvaluationRelationalRepositories(adapters.signalEvaluationAdapter),
  ...composeSetupAggregateRelationalRepositories(adapters.setupAggregateAdapter),
  ...composeResearchFeedbackDecisionRelationalRepositories(adapters.feedbackDecisionAdapter),
  ...composeResearchDecisionApprovalRelationalRepositories(adapters.approvalAdapter),
  ...composeResearchReviewDecisionRelationalRepositories(adapters.reviewDecisionAdapter),
  ...composeRoutedActionExecutionEnvelopeRelationalRepositories(adapters.routedActionAdapter)
});
