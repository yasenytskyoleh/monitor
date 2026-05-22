export type {
  RepositoryErrorCode,
  RepositoryErrorDetails,
  RepositoryOperation,
  RepositoryRetryDisposition
} from "./repository-error.js";
export {
  REPOSITORY_ERROR_CODES,
  REPOSITORY_OPERATIONS,
  REPOSITORY_RETRY_DISPOSITIONS,
  RepositoryError,
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
export type {
  FirstDurableRelationalAdapterErrorMapping,
  FirstDurableRelationalAdapterOperation,
  FirstDurableRelationalDeterministicErrorCode,
  FirstDurableRelationalRepositoryAdapter,
  FirstDurableRelationalRetryableErrorCode,
  ResearchHypothesisBundleWriteRequest,
  ResearchHypothesisDurableRecordBundle,
  SetupDefinitionRecordWriteRequest
} from "./first-durable-relational-repository-adapter.js";
export {
  FIRST_DURABLE_RELATIONAL_ADAPTER_ERROR_MAPPING,
  FIRST_DURABLE_RELATIONAL_ADAPTER_OPERATIONS,
  FIRST_DURABLE_RELATIONAL_DETERMINISTIC_ERROR_CODES,
  FIRST_DURABLE_RELATIONAL_RETRYABLE_ERROR_CODES,
  isFirstDurableRelationalDeterministicErrorCode
} from "./first-durable-relational-repository-adapter.js";
export {
  composeFirstDurableRelationalRepositories
} from "./first-durable-relational-repositories.js";
export type {
  FirstDurableRelationalRepositories
} from "./first-durable-relational-repositories.js";
export {
  dehydrateResearchHypothesisToDurableBundle,
  dehydrateSetupDefinitionToDurableRecord,
  hydrateResearchHypothesisFromDurableBundle,
  hydrateSetupDefinitionFromDurableRecord
} from "./first-durable-relational-repository-mappers.js";
export { InMemoryFirstDurableRelationalRepositoryAdapter } from "./first-durable-relational-repository-adapter.impl.js";
export {
  createFirstDurableRelationalPrismaClient,
  createFirstDurableRelationalPrismaRepositories,
  createFirstDurableRelationalPrismaRepositoryAdapter
} from "./first-durable-relational-prisma-client.js";
export type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalPrismaRepositories,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
export type {
  FirstDurableRelationalPrismaClient,
  FirstDurableRelationalPrismaTransactionClient
} from "./first-durable-relational-prisma-adapter.js";
export {
  PrismaFirstDurableRelationalRepositoryAdapter
} from "./first-durable-relational-prisma-adapter.js";
export type {
  MonitoredSymbolCreateRequest,
  MonitoredSymbolRepository,
  MonitoredSymbolStatusUpdateRequest,
  MonitoredSymbolUpdateRequest
} from "./monitored-symbol-repository.js";
export type {
  SetupDefinitionCreateRequest,
  SetupDefinitionRepository,
  SetupDefinitionStatusUpdateRequest,
  SetupDefinitionUpdateRequest
} from "./setup-definition-repository.js";
export { InMemorySetupDefinitionRepository } from "./setup-definition-repository.impl.js";
export { RelationalSetupDefinitionRepository } from "./setup-definition-relational-repository.impl.js";
export type {
  SignalCandidateCreateRequest,
  SignalCandidateRepository,
  SignalCandidateStatusUpdateRequest,
  SignalCandidateUpdateRequest
} from "./signal-candidate-repository.js";
export { InMemorySignalCandidateRepository } from "./signal-candidate-repository.impl.js";
export type {
  EvaluationResultCreateRequest,
  EvaluationResultRepository,
  EvaluationResultStatusUpdateRequest,
  EvaluationResultUpdateRequest
} from "./evaluation-result-repository.js";
export { InMemoryEvaluationResultRepository } from "./evaluation-result-repository.impl.js";
export type {
  ResearchHypothesisCreateRequest,
  ResearchHypothesisRepository,
  ResearchHypothesisStatusUpdateRequest,
  ResearchHypothesisUpdateRequest
} from "./research-hypothesis-repository.js";
export { InMemoryResearchHypothesisRepository } from "./research-hypothesis-repository.impl.js";
export { RelationalResearchHypothesisRepository } from "./research-hypothesis-relational-repository.impl.js";
export type {
  ResearchFeedbackDecisionCreateRequest,
  ResearchFeedbackDecisionRepository,
  ResearchFeedbackDecisionStatusUpdateRequest
} from "./research-feedback-decision-repository.js";
export { InMemoryResearchFeedbackDecisionRepository } from "./research-feedback-decision-repository.impl.js";
export type {
  ResearchDecisionApprovalCreateRequest,
  ResearchDecisionApprovalRepository
} from "./research-decision-approval-repository.js";
export { InMemoryResearchDecisionApprovalRepository } from "./research-decision-approval-repository.impl.js";
export type {
  ResearchReviewDecisionCreateRequest,
  ResearchReviewDecisionRepository
} from "./research-review-decision-repository.js";
export { InMemoryResearchReviewDecisionRepository } from "./research-review-decision-repository.impl.js";
export type {
  ReviewDecisionRoutingResultCreateRequest,
  ReviewDecisionRoutingResultRepository
} from "./review-decision-routing-result-repository.js";
export { InMemoryReviewDecisionRoutingResultRepository } from "./review-decision-routing-result-repository.impl.js";
export type {
  RoutedActionExecutionEnvelopeCreateRequest,
  RoutedActionExecutionEnvelopeRepository
} from "./routed-action-execution-envelope-repository.js";
export { InMemoryRoutedActionExecutionEnvelopeRepository } from "./routed-action-execution-envelope-repository.impl.js";
export type {
  SetupAggregateResultCreateRequest,
  SetupAggregateResultRepository,
  SetupAggregateResultStatusUpdateRequest,
  SetupAggregateResultUpdateRequest
} from "./setup-aggregate-result-repository.js";
export { InMemorySetupAggregateResultRepository } from "./setup-aggregate-result-repository.impl.js";
export type {
  SetupLifecycleMutationRecordCreateRequest,
  SetupLifecycleMutationRecordRepository
} from "./setup-lifecycle-mutation-record-repository.js";
export {
  InMemorySetupLifecycleMutationRecordRepository
} from "./setup-lifecycle-mutation-record-repository.impl.js";
export type {
  SetupDefinitionRevisionCreateRequest,
  SetupDefinitionRevisionRepository,
  SetupDefinitionRevisionStatusUpdateRequest
} from "./setup-definition-revision-repository.js";
export {
  InMemorySetupDefinitionRevisionRepository
} from "./setup-definition-revision-repository.impl.js";
export type {
  SetupRevisionActivationRecordCreateRequest,
  SetupRevisionActivationRecordRepository
} from "./setup-revision-activation-record-repository.js";
export {
  InMemorySetupRevisionActivationRecordRepository
} from "./setup-revision-activation-record-repository.impl.js";
export type {
  SetupRefinementRequestCreateRequest,
  SetupRefinementRequestRepository
} from "./setup-refinement-request-repository.js";
export {
  InMemorySetupRefinementRequestRepository
} from "./setup-refinement-request-repository.impl.js";
