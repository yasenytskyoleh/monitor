import type { TimestampUtc } from "../common.js";
import type { ResearchReviewAuthorizedNextAction } from "./research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "./research-review-decision-outcome.js";
import type { DownstreamActionTarget } from "./downstream-action-target.js";
import type { ReviewDecisionRouteStatus } from "./review-decision-route-status.js";

export const REVIEW_DECISION_DOWNSTREAM_COMMAND_TYPES = [
  "ApplyApprovedSetupMutationCommand",
  "CreateSetupRefinementRequestCommand",
  "ActivateSetupDefinitionRevisionCommand",
  "NoOpConfirmed",
  "None"
] as const;

export type ReviewDecisionDownstreamCommandType =
  (typeof REVIEW_DECISION_DOWNSTREAM_COMMAND_TYPES)[number];

export type ReviewDecisionRoutingResult = {
  status: ReviewDecisionRouteStatus;
  routingId?: string;
  researchReviewDecisionId?: string;
  setupFamilyId?: string;
  setupRevisionId?: string;
  decisionOutcome?: ResearchReviewDecisionOutcome;
  authorizedNextAction?: ResearchReviewAuthorizedNextAction;
  target?: DownstreamActionTarget;
  downstreamCommandType?: ReviewDecisionDownstreamCommandType;
  routedAt?: TimestampUtc;
  reason?: string;
  warnings: string[];
};
