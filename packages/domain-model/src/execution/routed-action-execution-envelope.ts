import type { TimestampUtc } from "../common.js";
import type {
  BuildRoutedActionExecutionEnvelopeCommand,
  RouteMetadataSnapshot,
  RoutedActionTargetEntityRefs
} from "./build-routed-action-execution-envelope-command.js";
import type { RoutedActionExecutionStatus } from "./routed-action-execution-status.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";

export type RoutedActionExecutionPayloadSnapshot =
  | {
      commandType: "ApplyApprovedSetupMutationCommand";
      target: "apply_setup_lifecycle_mutation";
      commandInput: {
        setupDefinitionId: string;
        setupFamilyId: string;
        sourceReviewDecisionId: string;
        sourceRoutingResultId: string;
      };
    }
  | {
      commandType: "CreateSetupRefinementRequestCommand";
      target: "create_setup_refinement_request";
      commandInput: {
        setupDefinitionId: string;
        setupFamilyId: string;
        sourceReviewDecisionId: string;
        sourceRoutingResultId: string;
      };
    }
  | {
      commandType: "ActivateSetupDefinitionRevisionCommand";
      target: "activate_setup_revision";
      commandInput: {
        setupRevisionId: string;
        setupFamilyId: string;
        sourceReviewDecisionId: string;
        sourceRoutingResultId: string;
      };
    };

export type RoutedActionExecutionEnvelope = {
  id: string;
  sourceRoutingResultId: string;
  sourceReviewDecisionId: string;
  actionTarget: DownstreamActionTarget;
  actionCommandType: ReviewDecisionDownstreamCommandType;
  targetEntityRefs: RoutedActionTargetEntityRefs;
  routeMetadataSnapshot: RouteMetadataSnapshot;
  executionPayloadSnapshot: RoutedActionExecutionPayloadSnapshot;
  executionStatus: RoutedActionExecutionStatus;
  preparedBy: string;
  preparedAt: TimestampUtc;
  originRunId?: string;
  notes?: string;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};

export type BuildRoutedActionExecutionEnvelopeInput = Pick<
  BuildRoutedActionExecutionEnvelopeCommand,
  "reviewDecisionRoutingResultId" | "researchReviewDecisionId" | "preparedBy" | "preparedAt"
>;
