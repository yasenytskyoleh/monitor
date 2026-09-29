import {
  createActivationEnvelopeExecutor,
  type ActivationEnvelopeExecutorOptions,
} from "@monitor/activation-envelope-executor";
import {
  createDownstreamActionExecutionPreparationService,
  createExecutionAttemptRuntimeFromRepositories,
  createReviewDecisionRoutingService,
  type DownstreamActionExecutor,
  type ImplementedProductRelationalRepositories,
} from "@monitor/domain-model";
import { createPreparedEnvelopeExecutionRuntime } from "@monitor/execution-attempt";
import {
  createLifecycleEnvelopeExecutor,
  type LifecycleEnvelopeExecutorOptions,
} from "@monitor/lifecycle-envelope-executor";
import {
  createRefinementEnvelopeExecutor,
  type RefinementEnvelopeExecutorOptions,
} from "@monitor/refinement-envelope-executor";
import {
  createReviewDecisionRoutingRuntime,
  type ReviewDecisionRoutingRuntime,
} from "@monitor/review-decision-routing";
import {
  createRoutedActionPreparationRuntime,
  type RoutedActionPreparationRuntime,
} from "@monitor/routed-action-preparation";

import { createDownstreamActionExecutorDispatcher } from "./downstream-action-executor-dispatcher.js";

export type ResearchWorkflowRepositories = Pick<
  ImplementedProductRelationalRepositories,
  | "executionAttemptAuditRepository"
  | "researchDecisionApprovalRepository"
  | "researchReviewDecisionRepository"
  | "reviewDecisionRoutingResultRepository"
  | "routedActionExecutionEnvelopeRepository"
  | "setupDefinitionRevisionRepository"
>;

export type ResearchWorkflowRuntimeOptions = {
  repositories: ResearchWorkflowRepositories;
  activationExecutor: Omit<ActivationEnvelopeExecutorOptions, "setupDefinitionRevisionRepository">;
  lifecycleExecutor: Omit<LifecycleEnvelopeExecutorOptions, "researchDecisionApprovalRepository">;
  refinementExecutor: Omit<RefinementEnvelopeExecutorOptions, "researchDecisionApprovalRepository">;
};

export type ResearchWorkflowRuntime = {
  reviewDecisionRouting: ReviewDecisionRoutingRuntime;
  routedActionPreparation: RoutedActionPreparationRuntime;
  preparedEnvelopeExecution: ReturnType<typeof createPreparedEnvelopeExecutionRuntime>;
};

const createExecutorDispatcher = (
  options: ResearchWorkflowRuntimeOptions,
): DownstreamActionExecutor => {
  const { repositories } = options;
  return createDownstreamActionExecutorDispatcher({
    activationExecutor: createActivationEnvelopeExecutor({
      ...options.activationExecutor,
      setupDefinitionRevisionRepository: repositories.setupDefinitionRevisionRepository,
    }),
    lifecycleExecutor: createLifecycleEnvelopeExecutor({
      ...options.lifecycleExecutor,
      researchDecisionApprovalRepository: repositories.researchDecisionApprovalRepository,
    }),
    refinementExecutor: createRefinementEnvelopeExecutor({
      ...options.refinementExecutor,
      researchDecisionApprovalRepository: repositories.researchDecisionApprovalRepository,
    }),
  });
};

export const createResearchWorkflowRoutingRuntime = (
  repositories: ResearchWorkflowRepositories,
): ReviewDecisionRoutingRuntime =>
  createReviewDecisionRoutingRuntime({
    researchReviewDecisionRepository: repositories.researchReviewDecisionRepository,
    reviewDecisionRoutingResultRepository: repositories.reviewDecisionRoutingResultRepository,
    reviewDecisionRoutingService: createReviewDecisionRoutingService({
      researchReviewDecisionRepository: repositories.researchReviewDecisionRepository,
    }),
  });

export const createResearchWorkflowPreparationRuntime = (
  repositories: ResearchWorkflowRepositories,
): RoutedActionPreparationRuntime =>
  createRoutedActionPreparationRuntime({
    reviewDecisionRoutingResultRepository: repositories.reviewDecisionRoutingResultRepository,
    preparationService: createDownstreamActionExecutionPreparationService({
      reviewDecisionRoutingResultRepository: repositories.reviewDecisionRoutingResultRepository,
      routedActionExecutionEnvelopeRepository: repositories.routedActionExecutionEnvelopeRepository,
    }),
  });

export const createResearchWorkflowExecutionRuntime = (
  repositories: ResearchWorkflowRepositories,
  downstreamActionExecutor: DownstreamActionExecutor,
): ReturnType<typeof createPreparedEnvelopeExecutionRuntime> =>
  createPreparedEnvelopeExecutionRuntime({
    routedActionExecutionEnvelopeRepository: repositories.routedActionExecutionEnvelopeRepository,
    executionAttemptRuntime: createExecutionAttemptRuntimeFromRepositories(
      repositories,
      downstreamActionExecutor,
    ),
  });

export const createResearchWorkflowRuntime = (
  options: ResearchWorkflowRuntimeOptions,
): ResearchWorkflowRuntime => {
  const { repositories } = options;

  return {
    reviewDecisionRouting: createResearchWorkflowRoutingRuntime(repositories),
    routedActionPreparation: createResearchWorkflowPreparationRuntime(repositories),
    preparedEnvelopeExecution: createResearchWorkflowExecutionRuntime(
      repositories,
      createExecutorDispatcher(options),
    ),
  };
};
