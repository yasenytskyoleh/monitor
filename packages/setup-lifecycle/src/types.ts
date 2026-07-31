import type {
  ApplyApprovedSetupMutationCommand,
  ApprovedSetupLifecycleAction,
  ProductRecordMetadata,
  ResearchDecisionApprovalRepository,
  SetupLifecycleMutationResult
} from "@monitor/domain-model";

export type ApprovedSetupLifecycleRequest = {
  researchDecisionApprovalId: string;
  mutatedBy: string;
  mutatedAt: string;
  approvedAction: ApprovedSetupLifecycleAction;
  notes?: string;
};

export type ApprovedSetupLifecycleHandoff = {
  apply(
    command: ApplyApprovedSetupMutationCommand,
    metadata: ProductRecordMetadata
  ): Promise<SetupLifecycleMutationResult>;
};

export type ApprovedSetupLifecycleRuntimeOptions = {
  researchDecisionApprovalRepository: Pick<ResearchDecisionApprovalRepository, "getById">;
  approvedSetupLifecycleHandoff: ApprovedSetupLifecycleHandoff;
};

export type ApprovedSetupLifecycleRuntime = {
  applyFromApprovedAction(
    request: ApprovedSetupLifecycleRequest
  ): Promise<SetupLifecycleMutationResult>;
};
