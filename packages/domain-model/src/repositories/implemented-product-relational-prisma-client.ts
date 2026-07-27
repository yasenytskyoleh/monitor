import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import type {
  FeedbackDecisionApprovalReviewPersistence
} from "./feedback-decision-approval-review-persistence.js";
import {
  createPrismaFeedbackDecisionApprovalReviewPersistence
} from "./feedback-decision-approval-review-persistence.prisma.js";
import { PrismaFirstDurableRelationalRepositoryAdapter } from "./first-durable-relational-prisma-adapter.js";
import { createMonitoredSymbolRelationalPrismaRepositoryAdapter } from "./monitored-symbol-relational-prisma-client.js";
import { type PrismaMonitoredSymbolRelationalRepositoryAdapter } from "./monitored-symbol-relational-prisma-adapter.js";
import {
  composeImplementedProductRelationalRepositories,
  type ImplementedProductRelationalAdapters,
  type ImplementedProductRelationalRepositories
} from "./implemented-product-relational-repositories.js";
import { createResearchDecisionApprovalRelationalPrismaRepositoryAdapter } from "./research-decision-approval-relational-prisma-client.js";
import { type PrismaResearchDecisionApprovalRelationalRepositoryAdapter } from "./research-decision-approval-relational-prisma-adapter.js";
import { createResearchReviewDecisionRelationalPrismaRepositoryAdapter } from "./research-review-decision-relational-prisma-client.js";
import { type PrismaResearchReviewDecisionRelationalRepositoryAdapter } from "./research-review-decision-relational-prisma-adapter.js";
import { createResearchRunRelationalPrismaRepositoryAdapter } from "./research-run-relational-prisma-client.js";
import { type PrismaResearchRunRelationalRepositoryAdapter } from "./research-run-relational-prisma-adapter.js";
import { createReviewDecisionRoutingResultRelationalPrismaRepositoryAdapter } from "./review-decision-routing-result-relational-prisma-client.js";
import { type PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter } from "./review-decision-routing-result-relational-prisma-adapter.js";
import { createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter } from "./research-feedback-decision-relational-prisma-client.js";
import { type PrismaResearchFeedbackDecisionRelationalRepositoryAdapter } from "./research-feedback-decision-relational-prisma-adapter.js";
import { createRoutedActionExecutionEnvelopeRelationalPrismaRepositoryAdapter } from "./routed-action-execution-envelope-relational-prisma-client.js";
import { type PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter } from "./routed-action-execution-envelope-relational-prisma-adapter.js";
import { createSetupLifecycleMutationRecordRelationalPrismaRepositoryAdapter } from "./setup-lifecycle-mutation-record-relational-prisma-client.js";
import { type PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter } from "./setup-lifecycle-mutation-record-relational-prisma-adapter.js";
import { createSetupDefinitionRevisionRelationalPrismaRepositoryAdapter } from "./setup-definition-revision-relational-prisma-client.js";
import { type PrismaSetupDefinitionRevisionRelationalRepositoryAdapter } from "./setup-definition-revision-relational-prisma-adapter.js";
import { createSetupRefinementRequestRelationalPrismaRepositoryAdapter } from "./setup-refinement-request-relational-prisma-client.js";
import { type PrismaSetupRefinementRequestRelationalRepositoryAdapter } from "./setup-refinement-request-relational-prisma-adapter.js";
import { createSetupRevisionActivationRecordRelationalPrismaRepositoryAdapter } from "./setup-revision-activation-record-relational-prisma-client.js";
import { type PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter } from "./setup-revision-activation-record-relational-prisma-adapter.js";
import { createSetupAggregateRelationalPrismaRepositoryAdapter } from "./setup-aggregate-relational-prisma-client.js";
import { type PrismaSetupAggregateRelationalRepositoryAdapter } from "./setup-aggregate-relational-prisma-adapter.js";
import { createSignalEvaluationRelationalPrismaRepositoryAdapter } from "./signal-evaluation-relational-prisma-client.js";
import { type PrismaSignalEvaluationRelationalRepositoryAdapter } from "./signal-evaluation-relational-prisma-adapter.js";

export type ImplementedProductRelationalPrismaAdapters = ImplementedProductRelationalAdapters & {
  firstDurableAdapter: PrismaFirstDurableRelationalRepositoryAdapter;
  monitoredSymbolAdapter: PrismaMonitoredSymbolRelationalRepositoryAdapter;
  signalEvaluationAdapter: PrismaSignalEvaluationRelationalRepositoryAdapter;
  setupAggregateAdapter: PrismaSetupAggregateRelationalRepositoryAdapter;
  feedbackDecisionAdapter: PrismaResearchFeedbackDecisionRelationalRepositoryAdapter;
  researchRunAdapter: PrismaResearchRunRelationalRepositoryAdapter;
  approvalAdapter: PrismaResearchDecisionApprovalRelationalRepositoryAdapter;
  reviewDecisionAdapter: PrismaResearchReviewDecisionRelationalRepositoryAdapter;
  reviewDecisionRoutingResultAdapter:
    PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter;
  routedActionAdapter: PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter;
  setupLifecycleMutationRecordAdapter:
    PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter;
  setupDefinitionRevisionAdapter:
    PrismaSetupDefinitionRevisionRelationalRepositoryAdapter;
  setupRefinementRequestAdapter:
    PrismaSetupRefinementRequestRelationalRepositoryAdapter;
  setupRevisionActivationRecordAdapter:
    PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter;
};

export type ImplementedProductRelationalPrismaRepositories =
  ImplementedProductRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapters: ImplementedProductRelationalPrismaAdapters;
    feedbackDecisionApprovalReviewPersistence: FeedbackDecisionApprovalReviewPersistence;
    disconnect(): Promise<void>;
  };

export const createImplementedProductRelationalPrismaAdapters = (
  client: FirstDurableRelationalRuntimePrismaClient
): ImplementedProductRelationalPrismaAdapters => ({
  firstDurableAdapter: new PrismaFirstDurableRelationalRepositoryAdapter(client),
  monitoredSymbolAdapter: createMonitoredSymbolRelationalPrismaRepositoryAdapter(client),
  signalEvaluationAdapter: createSignalEvaluationRelationalPrismaRepositoryAdapter(client),
  setupAggregateAdapter: createSetupAggregateRelationalPrismaRepositoryAdapter(client),
  feedbackDecisionAdapter: createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter(client),
  researchRunAdapter: createResearchRunRelationalPrismaRepositoryAdapter(client),
  approvalAdapter: createResearchDecisionApprovalRelationalPrismaRepositoryAdapter(client),
  reviewDecisionAdapter: createResearchReviewDecisionRelationalPrismaRepositoryAdapter(client),
  reviewDecisionRoutingResultAdapter:
    createReviewDecisionRoutingResultRelationalPrismaRepositoryAdapter(client),
  routedActionAdapter: createRoutedActionExecutionEnvelopeRelationalPrismaRepositoryAdapter(
    client
  ),
  setupLifecycleMutationRecordAdapter:
    createSetupLifecycleMutationRecordRelationalPrismaRepositoryAdapter(client),
  setupDefinitionRevisionAdapter:
    createSetupDefinitionRevisionRelationalPrismaRepositoryAdapter(client),
  setupRefinementRequestAdapter:
    createSetupRefinementRequestRelationalPrismaRepositoryAdapter(client),
  setupRevisionActivationRecordAdapter:
    createSetupRevisionActivationRecordRelationalPrismaRepositoryAdapter(client)
});

export const createImplementedProductRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ImplementedProductRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapters = createImplementedProductRelationalPrismaAdapters(prismaClient);
  const feedbackDecisionApprovalReviewPersistence =
    createPrismaFeedbackDecisionApprovalReviewPersistence(prismaClient);

  return {
    prismaClient,
    adapters,
    feedbackDecisionApprovalReviewPersistence,
    ...composeImplementedProductRelationalRepositories(adapters),
    disconnect: async () => prismaClient.$disconnect()
  };
};
