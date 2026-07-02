import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";
import type { ReviewDecisionRoutingResultRepository } from "../repositories/review-decision-routing-result-repository.js";
import type { RoutedActionExecutionEnvelopeRepository } from "../repositories/routed-action-execution-envelope-repository.js";
import type {
  BuildRoutedActionExecutionEnvelopeCommand,
  RouteMetadataSnapshot
} from "./build-routed-action-execution-envelope-command.js";
import type {
  RoutedActionExecutionEnvelope,
  RoutedActionExecutionPayloadSnapshot
} from "./routed-action-execution-envelope.js";
import type { RoutedActionExecutionResult } from "./routed-action-execution-result.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";

export type BuildRoutedActionExecutionEnvelopeRequest = {
  command: BuildRoutedActionExecutionEnvelopeCommand;
  metadata: ProductRecordMetadata;
};

export type DownstreamActionExecutionPreparationServiceDependencies = {
  reviewDecisionRoutingResultRepository: Pick<ReviewDecisionRoutingResultRepository, "getById">;
  routedActionExecutionEnvelopeRepository: RoutedActionExecutionEnvelopeRepository;
};

export type DownstreamActionExecutionPreparationService = {
  prepare(
    request: BuildRoutedActionExecutionEnvelopeRequest
  ): Promise<RoutedActionExecutionResult>;
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected routed action execution envelope failure";

const expectedCommandType = (
  target: DownstreamActionTarget
): "ApplyApprovedSetupMutationCommand" | "CreateSetupRefinementRequestCommand" | "ActivateSetupDefinitionRevisionCommand" | "NoOpConfirmed" => {
  if (target === "apply_setup_lifecycle_mutation") {
    return "ApplyApprovedSetupMutationCommand";
  }

  if (target === "create_setup_refinement_request") {
    return "CreateSetupRefinementRequestCommand";
  }

  if (target === "activate_setup_revision") {
    return "ActivateSetupDefinitionRevisionCommand";
  }

  return "NoOpConfirmed";
};

const buildEnvelopeId = (command: BuildRoutedActionExecutionEnvelopeCommand): string =>
  `execution-envelope:${command.reviewDecisionRoutingResultId}:${command.preparedAt}`;

const resolveUpdatedAt = (
  preparedAt: string,
  sourceObservedAtUtc: string | null | undefined
): string => {
  if (!sourceObservedAtUtc || sourceObservedAtUtc < preparedAt) {
    return preparedAt;
  }

  return sourceObservedAtUtc;
};

const buildRouteMetadataSnapshot = (
  command: BuildRoutedActionExecutionEnvelopeCommand,
  fallback: {
    routeStatus: RouteMetadataSnapshot["routeStatus"];
    routedAt: string | undefined;
    decisionOutcome: RouteMetadataSnapshot["decisionOutcome"];
    authorizedNextAction: RouteMetadataSnapshot["authorizedNextAction"];
    downstreamCommandType: RouteMetadataSnapshot["downstreamCommandType"];
  }
): RouteMetadataSnapshot => ({
  routeStatus: command.routeMetadataSnapshot?.routeStatus ?? fallback.routeStatus,
  routedAt: command.routeMetadataSnapshot?.routedAt ?? fallback.routedAt,
  decisionOutcome: command.routeMetadataSnapshot?.decisionOutcome ?? fallback.decisionOutcome,
  authorizedNextAction:
    command.routeMetadataSnapshot?.authorizedNextAction ?? fallback.authorizedNextAction,
  downstreamCommandType:
    command.routeMetadataSnapshot?.downstreamCommandType ?? fallback.downstreamCommandType
});

const buildPayloadSnapshot = (
  command: BuildRoutedActionExecutionEnvelopeCommand
): RoutedActionExecutionPayloadSnapshot => {
  if (command.downstreamActionTarget === "apply_setup_lifecycle_mutation") {
    const setupDefinitionId = command.targetEntityRefs.setupDefinitionId as string;
    return {
      commandType: "ApplyApprovedSetupMutationCommand",
      target: "apply_setup_lifecycle_mutation",
      commandInput: {
        setupDefinitionId,
        setupFamilyId: command.targetEntityRefs.setupFamilyId,
        sourceReviewDecisionId: command.researchReviewDecisionId,
        sourceRoutingResultId: command.reviewDecisionRoutingResultId
      }
    };
  }

  if (command.downstreamActionTarget === "create_setup_refinement_request") {
    const setupDefinitionId = command.targetEntityRefs.setupDefinitionId as string;
    return {
      commandType: "CreateSetupRefinementRequestCommand",
      target: "create_setup_refinement_request",
      commandInput: {
        setupDefinitionId,
        setupFamilyId: command.targetEntityRefs.setupFamilyId,
        sourceReviewDecisionId: command.researchReviewDecisionId,
        sourceRoutingResultId: command.reviewDecisionRoutingResultId
      }
    };
  }

  return {
    commandType: "ActivateSetupDefinitionRevisionCommand",
    target: "activate_setup_revision",
    commandInput: {
      setupRevisionId: command.targetEntityRefs.setupRevisionId as string,
      setupFamilyId: command.targetEntityRefs.setupFamilyId,
      sourceReviewDecisionId: command.researchReviewDecisionId,
      sourceRoutingResultId: command.reviewDecisionRoutingResultId
    }
  };
};

export const createDownstreamActionExecutionPreparationService = (
  dependencies: DownstreamActionExecutionPreparationServiceDependencies
): DownstreamActionExecutionPreparationService => {
  const {
    reviewDecisionRoutingResultRepository,
    routedActionExecutionEnvelopeRepository
  } = dependencies;

  return {
    async prepare(request): Promise<RoutedActionExecutionResult> {
      const { command, metadata } = request;
      try {
        if (!command.reviewDecisionRoutingResultId.trim()) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "reviewDecisionRoutingResultId is required",
            warnings: []
          };
        }

        if (!command.researchReviewDecisionId.trim()) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            actionTarget: command.downstreamActionTarget,
            reason: "researchReviewDecisionId is required",
            warnings: []
          };
        }

        if (!command.targetEntityRefs.setupFamilyId.trim()) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "targetEntityRefs.setupFamilyId is required",
            warnings: []
          };
        }

        if (!command.preparedBy.trim()) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "preparedBy is required",
            warnings: []
          };
        }

        if (!command.preparedAt.trim()) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "preparedAt is required",
            warnings: []
          };
        }

        const routingResult = await reviewDecisionRoutingResultRepository.getById(
          command.reviewDecisionRoutingResultId
        );
        if (!routingResult) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: `review_decision_routing_result not found: ${command.reviewDecisionRoutingResultId}`,
            warnings: []
          };
        }

        if (routingResult.status !== "routed" && routingResult.status !== "no_action") {
          return {
            status: "rejected_lifecycle",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: `routing result status is not executable: ${routingResult.status}`,
            warnings: routingResult.warnings
          };
        }

        if (routingResult.researchReviewDecisionId !== command.researchReviewDecisionId) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "routing result / review decision mismatch",
            warnings: []
          };
        }

        if (routingResult.setupFamilyId !== command.targetEntityRefs.setupFamilyId) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "routing result / targetEntityRefs.setupFamilyId mismatch",
            warnings: []
          };
        }

        if (routingResult.target !== command.downstreamActionTarget) {
          return {
            status: "rejected_lifecycle",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "downstreamActionTarget does not match routed target",
            warnings: []
          };
        }

        if (command.downstreamActionTarget === "no_op_confirmed" || routingResult.status === "no_action") {
          return {
            status: "no_envelope",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            downstreamCommandType: "None",
            preparedAt: command.preparedAt,
            reason: "no_op_confirmed routes are auditable but do not produce executable envelopes",
            warnings: routingResult.warnings
          };
        }

        const mappedCommandType = expectedCommandType(command.downstreamActionTarget);
        if (routingResult.downstreamCommandType && routingResult.downstreamCommandType !== mappedCommandType) {
          return {
            status: "rejected_lifecycle",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "routing result downstreamCommandType conflicts with downstreamActionTarget mapping",
            warnings: []
          };
        }

        if (
          command.routeMetadataSnapshot?.downstreamCommandType &&
          command.routeMetadataSnapshot.downstreamCommandType !== mappedCommandType
        ) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "routeMetadataSnapshot.downstreamCommandType conflicts with mapped command type",
            warnings: []
          };
        }

        if (
          (command.downstreamActionTarget === "apply_setup_lifecycle_mutation" ||
            command.downstreamActionTarget === "create_setup_refinement_request") &&
          !command.targetEntityRefs.setupDefinitionId
        ) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "setupDefinitionId is required for lifecycle-mutation/refinement execution envelopes",
            warnings: []
          };
        }

        if (command.downstreamActionTarget === "activate_setup_revision" && !command.targetEntityRefs.setupRevisionId) {
          return {
            status: "rejected_validation",
            reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
            researchReviewDecisionId: command.researchReviewDecisionId,
            actionTarget: command.downstreamActionTarget,
            reason: "setupRevisionId is required for revision-activation execution envelopes",
            warnings: []
          };
        }

        const routeMetadataSnapshot = buildRouteMetadataSnapshot(command, {
          routeStatus: routingResult.status,
          routedAt: routingResult.routedAt,
          decisionOutcome: routingResult.decisionOutcome,
          authorizedNextAction: routingResult.authorizedNextAction,
          downstreamCommandType: mappedCommandType
        });

        const envelope: RoutedActionExecutionEnvelope = {
          id: buildEnvelopeId(command),
          sourceRoutingResultId: command.reviewDecisionRoutingResultId,
          sourceReviewDecisionId: command.researchReviewDecisionId,
          actionTarget: command.downstreamActionTarget,
          actionCommandType: mappedCommandType,
          targetEntityRefs: command.targetEntityRefs,
          routeMetadataSnapshot,
          executionPayloadSnapshot: buildPayloadSnapshot(command),
          executionStatus: "prepared",
          preparedBy: command.preparedBy,
          preparedAt: command.preparedAt,
          originRunId: command.originRunId,
          createdAt: command.preparedAt,
          updatedAt: resolveUpdatedAt(command.preparedAt, metadata.sourceObservedAtUtc)
        };

        const persisted = await routedActionExecutionEnvelopeRepository.create({
          envelope,
          metadata
        });

        return {
          status: "prepared",
          envelope: persisted,
          envelopeId: persisted.id,
          reviewDecisionRoutingResultId: persisted.sourceRoutingResultId,
          researchReviewDecisionId: persisted.sourceReviewDecisionId,
          actionTarget: persisted.actionTarget,
          downstreamCommandType: persisted.actionCommandType,
          preparedAt: persisted.preparedAt,
          warnings: routingResult.warnings
        };
      } catch (error: unknown) {
        return {
          status: "failed",
          reviewDecisionRoutingResultId: request.command.reviewDecisionRoutingResultId,
          researchReviewDecisionId: request.command.researchReviewDecisionId,
          actionTarget: request.command.downstreamActionTarget,
          preparedAt: request.command.preparedAt,
          reason: asErrorMessage(error),
          warnings: [
            "routed action execution envelope preparation can be retried after resolving preparation failure"
          ]
        };
      }
    }
  };
};
