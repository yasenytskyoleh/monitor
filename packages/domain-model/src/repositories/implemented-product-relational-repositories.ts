import type {
  FirstDurableRelationalRepositoryAdapter
} from "./first-durable-relational-repository-adapter.js";
import {
  composeFirstDurableRelationalRepositories,
  type FirstDurableRelationalRepositories
} from "./first-durable-relational-repositories.js";
import type {
  MonitoredSymbolRelationalRepositoryAdapter
} from "./monitored-symbol-relational-repository-adapter.js";
import {
  composeMonitoredSymbolRelationalRepositories,
  type MonitoredSymbolRelationalRepositories
} from "./monitored-symbol-relational-repositories.js";
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
  ReviewDecisionRoutingResultRelationalRepositoryAdapter
} from "./review-decision-routing-result-relational-repository-adapter.js";
import {
  composeReviewDecisionRoutingResultRelationalRepositories,
  type ReviewDecisionRoutingResultRelationalRepositories
} from "./review-decision-routing-result-relational-repositories.js";
import type {
  RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
} from "./routed-action-execution-envelope-relational-repository-adapter.js";
import {
  composeRoutedActionExecutionEnvelopeRelationalRepositories,
  type RoutedActionExecutionEnvelopeRelationalRepositories
} from "./routed-action-execution-envelope-relational-repositories.js";
import type {
  ExecutionAttemptAuditRelationalRepositoryAdapter
} from "./execution-attempt-audit-relational-repository-adapter.js";
import {
  composeExecutionAttemptAuditRelationalRepositories,
  type ExecutionAttemptAuditRelationalRepositories
} from "./execution-attempt-audit-relational-repositories.js";
import type {
  SetupLifecycleMutationRecordRelationalRepositoryAdapter
} from "./setup-lifecycle-mutation-record-relational-repository-adapter.js";
import {
  composeSetupLifecycleMutationRecordRelationalRepositories,
  type SetupLifecycleMutationRecordRelationalRepositories
} from "./setup-lifecycle-mutation-record-relational-repositories.js";
import type {
  SetupDefinitionRevisionRelationalRepositoryAdapter
} from "./setup-definition-revision-relational-repository-adapter.js";
import {
  composeSetupDefinitionRevisionRelationalRepositories,
  type SetupDefinitionRevisionRelationalRepositories
} from "./setup-definition-revision-relational-repositories.js";
import type {
  SetupRevisionActivationRecordRelationalRepositoryAdapter
} from "./setup-revision-activation-record-relational-repository-adapter.js";
import {
  composeSetupRevisionActivationRecordRelationalRepositories,
  type SetupRevisionActivationRecordRelationalRepositories
} from "./setup-revision-activation-record-relational-repositories.js";
import type {
  SetupRefinementRequestRelationalRepositoryAdapter
} from "./setup-refinement-request-relational-repository-adapter.js";
import {
  composeSetupRefinementRequestRelationalRepositories,
  type SetupRefinementRequestRelationalRepositories
} from "./setup-refinement-request-relational-repositories.js";
import {
  composeResearchFeedbackDecisionRelationalRepositories,
  type ResearchFeedbackDecisionRelationalRepositories
} from "./research-feedback-decision-relational-repositories.js";
import type {
  ResearchFeedbackDecisionRelationalRepositoryAdapter
} from "./research-feedback-decision-relational-repository-adapter.js";
import type {
  ResearchRunRelationalRepositoryAdapter
} from "./research-run-relational-repository-adapter.js";
import {
  composeResearchRunRelationalRepositories,
  type ResearchRunRelationalRepositories
} from "./research-run-relational-repositories.js";
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
  monitoredSymbolAdapter: MonitoredSymbolRelationalRepositoryAdapter;
  signalEvaluationAdapter: SignalEvaluationRelationalRepositoryAdapter;
  setupAggregateAdapter: SetupAggregateRelationalRepositoryAdapter;
  feedbackDecisionAdapter: ResearchFeedbackDecisionRelationalRepositoryAdapter;
  researchRunAdapter: ResearchRunRelationalRepositoryAdapter;
  approvalAdapter: ResearchDecisionApprovalRelationalRepositoryAdapter;
  reviewDecisionAdapter: ResearchReviewDecisionRelationalRepositoryAdapter;
  reviewDecisionRoutingResultAdapter: ReviewDecisionRoutingResultRelationalRepositoryAdapter;
  routedActionAdapter: RoutedActionExecutionEnvelopeRelationalRepositoryAdapter;
  executionAttemptAuditAdapter: ExecutionAttemptAuditRelationalRepositoryAdapter;
  setupLifecycleMutationRecordAdapter: SetupLifecycleMutationRecordRelationalRepositoryAdapter;
  setupDefinitionRevisionAdapter: SetupDefinitionRevisionRelationalRepositoryAdapter;
  setupRefinementRequestAdapter: SetupRefinementRequestRelationalRepositoryAdapter;
  setupRevisionActivationRecordAdapter:
    SetupRevisionActivationRecordRelationalRepositoryAdapter;
};

export type ImplementedProductRelationalRepositories =
  FirstDurableRelationalRepositories &
  MonitoredSymbolRelationalRepositories &
  SignalEvaluationRelationalRepositories &
  SetupAggregateRelationalRepositories &
  ResearchFeedbackDecisionRelationalRepositories &
  ResearchRunRelationalRepositories &
  ResearchDecisionApprovalRelationalRepositories &
  ResearchReviewDecisionRelationalRepositories &
  ReviewDecisionRoutingResultRelationalRepositories &
  RoutedActionExecutionEnvelopeRelationalRepositories &
  ExecutionAttemptAuditRelationalRepositories &
  SetupLifecycleMutationRecordRelationalRepositories &
  SetupDefinitionRevisionRelationalRepositories &
  SetupRefinementRequestRelationalRepositories &
  SetupRevisionActivationRecordRelationalRepositories;

export const composeImplementedProductRelationalRepositories = (
  adapters: ImplementedProductRelationalAdapters
): ImplementedProductRelationalRepositories => ({
  ...composeFirstDurableRelationalRepositories(adapters.firstDurableAdapter),
  ...composeMonitoredSymbolRelationalRepositories(adapters.monitoredSymbolAdapter),
  ...composeSignalEvaluationRelationalRepositories(adapters.signalEvaluationAdapter),
  ...composeSetupAggregateRelationalRepositories(adapters.setupAggregateAdapter),
  ...composeResearchFeedbackDecisionRelationalRepositories(adapters.feedbackDecisionAdapter),
  ...composeResearchRunRelationalRepositories(adapters.researchRunAdapter),
  ...composeResearchDecisionApprovalRelationalRepositories(adapters.approvalAdapter),
  ...composeResearchReviewDecisionRelationalRepositories(adapters.reviewDecisionAdapter),
  ...composeReviewDecisionRoutingResultRelationalRepositories(
    adapters.reviewDecisionRoutingResultAdapter
  ),
  ...composeRoutedActionExecutionEnvelopeRelationalRepositories(adapters.routedActionAdapter),
  ...composeExecutionAttemptAuditRelationalRepositories(adapters.executionAttemptAuditAdapter),
  ...composeSetupLifecycleMutationRecordRelationalRepositories(
    adapters.setupLifecycleMutationRecordAdapter
  ),
  ...composeSetupDefinitionRevisionRelationalRepositories(
    adapters.setupDefinitionRevisionAdapter
  ),
  ...composeSetupRefinementRequestRelationalRepositories(
    adapters.setupRefinementRequestAdapter
  ),
  ...composeSetupRevisionActivationRecordRelationalRepositories(
    adapters.setupRevisionActivationRecordAdapter
  )
});
