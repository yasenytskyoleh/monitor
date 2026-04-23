import type { ResearchReviewDecisionRepository } from "../repositories/research-review-decision-repository.js";
import {
  RESEARCH_REVIEW_AUTHORIZED_NEXT_ACTIONS,
  type ResearchReviewAuthorizedNextAction
} from "./research-review-decision.js";
import {
  RESEARCH_REVIEW_DECISION_OUTCOMES
} from "./research-review-decision-outcome.js";
import type { RouteAcceptedReviewDecisionCommand } from "./route-accepted-review-decision-command.js";
import type { ReviewDecisionRoutingResult } from "./review-decision-routing-result.js";

export type ReviewDecisionRoutingServiceDependencies = {
  researchReviewDecisionRepository: Pick<ResearchReviewDecisionRepository, "getById">;
};

export type ReviewDecisionRoutingService = {
  route(command: RouteAcceptedReviewDecisionCommand): Promise<ReviewDecisionRoutingResult>;
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unexpected review decision routing failure";

const buildRoutingId = (command: RouteAcceptedReviewDecisionCommand): string =>
  `review-route:${command.researchReviewDecisionId}:${command.routedAt}`;

export const createReviewDecisionRoutingService = (
  dependencies: ReviewDecisionRoutingServiceDependencies
): ReviewDecisionRoutingService => {
  const { researchReviewDecisionRepository } = dependencies;

  return {
    async route(command): Promise<ReviewDecisionRoutingResult> {
      try {
        if (!command.researchReviewDecisionId.trim()) {
          return {
            status: "rejected_validation",
            setupFamilyId: command.setupFamilyId,
            reason: "researchReviewDecisionId is required",
            warnings: []
          };
        }

        if (!command.setupFamilyId.trim()) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: command.researchReviewDecisionId,
            reason: "setupFamilyId is required",
            warnings: []
          };
        }

        if (!command.routedAt.trim()) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: command.researchReviewDecisionId,
            setupFamilyId: command.setupFamilyId,
            reason: "routedAt is required",
            warnings: []
          };
        }

        if (!RESEARCH_REVIEW_DECISION_OUTCOMES.includes(command.decisionOutcome)) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: command.researchReviewDecisionId,
            setupFamilyId: command.setupFamilyId,
            reason: `invalid decisionOutcome: ${command.decisionOutcome}`,
            warnings: []
          };
        }

        if (
          command.authorizedNextAction &&
          !RESEARCH_REVIEW_AUTHORIZED_NEXT_ACTIONS.includes(command.authorizedNextAction)
        ) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: command.researchReviewDecisionId,
            setupFamilyId: command.setupFamilyId,
            decisionOutcome: command.decisionOutcome,
            reason: `invalid authorizedNextAction: ${command.authorizedNextAction}`,
            warnings: []
          };
        }

        const decision = await researchReviewDecisionRepository.getById(command.researchReviewDecisionId);
        if (!decision) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: command.researchReviewDecisionId,
            setupFamilyId: command.setupFamilyId,
            decisionOutcome: command.decisionOutcome,
            reason: `research_review_decision not found: ${command.researchReviewDecisionId}`,
            warnings: []
          };
        }

        if (decision.setupFamilyId !== command.setupFamilyId) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: decision.id,
            setupFamilyId: command.setupFamilyId,
            decisionOutcome: command.decisionOutcome,
            reason: "research_review_decision / setupFamilyId mismatch",
            warnings: []
          };
        }

        if (command.setupRevisionId && decision.setupRevisionId !== command.setupRevisionId) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: decision.id,
            setupFamilyId: command.setupFamilyId,
            setupRevisionId: command.setupRevisionId,
            decisionOutcome: command.decisionOutcome,
            reason: "research_review_decision / setupRevisionId mismatch",
            warnings: []
          };
        }

        if (decision.decisionOutcome !== command.decisionOutcome) {
          return {
            status: "rejected_lifecycle",
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: command.decisionOutcome,
            reason: "command decisionOutcome does not match recorded research review decision outcome",
            warnings: []
          };
        }

        const resolvedAction = command.authorizedNextAction ?? decision.authorizedNextAction;
        if (command.authorizedNextAction && decision.authorizedNextAction && command.authorizedNextAction !== decision.authorizedNextAction) {
          return {
            status: "rejected_lifecycle",
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            authorizedNextAction: command.authorizedNextAction,
            reason: "command authorizedNextAction does not match recorded research review decision action",
            warnings: []
          };
        }

        if (decision.decisionOutcome === "rejected") {
          if (resolvedAction) {
            return {
              status: "rejected_lifecycle",
              researchReviewDecisionId: decision.id,
              setupFamilyId: decision.setupFamilyId,
              setupRevisionId: decision.setupRevisionId,
              decisionOutcome: decision.decisionOutcome,
              authorizedNextAction: resolvedAction,
              reason: "rejected review decisions cannot route to downstream actions",
              warnings: []
            };
          }

          return {
            status: "no_action",
            routingId: buildRoutingId(command),
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            downstreamCommandType: "None",
            routedAt: command.routedAt,
            warnings: []
          };
        }

        if (!resolvedAction) {
          return {
            status: "rejected_validation",
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            reason: "authorizedNextAction is required for routable review decisions",
            warnings: []
          };
        }

        if (decision.decisionOutcome === "revise") {
          if (resolvedAction !== "prepare_refinement_follow_up") {
            return {
              status: "rejected_lifecycle",
              researchReviewDecisionId: decision.id,
              setupFamilyId: decision.setupFamilyId,
              setupRevisionId: decision.setupRevisionId,
              decisionOutcome: decision.decisionOutcome,
              authorizedNextAction: resolvedAction,
              reason: "revise decisions may only route to refinement follow-up",
              warnings: []
            };
          }

          return {
            status: "routed",
            routingId: buildRoutingId(command),
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            authorizedNextAction: resolvedAction,
            target: "create_setup_refinement_request",
            downstreamCommandType: "CreateSetupRefinementRequestCommand",
            routedAt: command.routedAt,
            warnings: []
          };
        }

        if (resolvedAction === "prepare_lifecycle_mutation_follow_up") {
          return {
            status: "routed",
            routingId: buildRoutingId(command),
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            authorizedNextAction: resolvedAction,
            target: "apply_setup_lifecycle_mutation",
            downstreamCommandType: "ApplyApprovedSetupMutationCommand",
            routedAt: command.routedAt,
            warnings: []
          };
        }

        if (resolvedAction === "prepare_refinement_follow_up") {
          return {
            status: "routed",
            routingId: buildRoutingId(command),
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId: decision.setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            authorizedNextAction: resolvedAction,
            target: "create_setup_refinement_request",
            downstreamCommandType: "CreateSetupRefinementRequestCommand",
            routedAt: command.routedAt,
            warnings: []
          };
        }

        if (resolvedAction === "prepare_activation_follow_up") {
          const setupRevisionId = command.setupRevisionId ?? decision.setupRevisionId;
          if (!setupRevisionId) {
            return {
              status: "rejected_lifecycle",
              researchReviewDecisionId: decision.id,
              setupFamilyId: decision.setupFamilyId,
              decisionOutcome: decision.decisionOutcome,
              authorizedNextAction: resolvedAction,
              reason: "activate_setup_revision routing requires setupRevisionId context",
              warnings: []
            };
          }

          return {
            status: "routed",
            routingId: buildRoutingId(command),
            researchReviewDecisionId: decision.id,
            setupFamilyId: decision.setupFamilyId,
            setupRevisionId,
            decisionOutcome: decision.decisionOutcome,
            authorizedNextAction: resolvedAction,
            target: "activate_setup_revision",
            downstreamCommandType: "ActivateSetupDefinitionRevisionCommand",
            routedAt: command.routedAt,
            warnings: []
          };
        }

        return {
          status: "no_action",
          routingId: buildRoutingId(command),
          researchReviewDecisionId: decision.id,
          setupFamilyId: decision.setupFamilyId,
          setupRevisionId: decision.setupRevisionId,
          decisionOutcome: decision.decisionOutcome,
          authorizedNextAction: resolvedAction,
          target: "no_op_confirmed",
          downstreamCommandType: "NoOpConfirmed",
          routedAt: command.routedAt,
          warnings: []
        };
      } catch (error: unknown) {
        return {
          status: "failed",
          researchReviewDecisionId: command.researchReviewDecisionId,
          setupFamilyId: command.setupFamilyId,
          setupRevisionId: command.setupRevisionId,
          decisionOutcome: command.decisionOutcome,
          authorizedNextAction: command.authorizedNextAction,
          reason: asErrorMessage(error),
          warnings: [
            "review decision routing can be retried after resolving routing service failure"
          ]
        };
      }
    }
  };
};
