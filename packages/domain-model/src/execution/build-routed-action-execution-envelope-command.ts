import type { TimestampUtc } from "../common.js";
import type { ResearchReviewAuthorizedNextAction } from "../review/research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "../review/research-review-decision-outcome.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";
import type { ReviewDecisionRouteStatus } from "../review/review-decision-route-status.js";

export type RoutedActionTargetEntityRefs = {
  setupFamilyId: string;
  setupDefinitionId?: string;
  setupRevisionId?: string;
  researchHypothesisId?: string;
  researchFeedbackDecisionId?: string;
  researchDecisionApprovalId?: string;
};

export type RouteMetadataSnapshot = {
  routeStatus: ReviewDecisionRouteStatus;
  routedAt?: TimestampUtc;
  decisionOutcome?: ResearchReviewDecisionOutcome;
  authorizedNextAction?: ResearchReviewAuthorizedNextAction;
  downstreamCommandType?: ReviewDecisionDownstreamCommandType;
};

export type BuildRoutedActionExecutionEnvelopeCommand = {
  reviewDecisionRoutingResultId: string;
  researchReviewDecisionId: string;
  downstreamActionTarget: DownstreamActionTarget;
  targetEntityRefs: RoutedActionTargetEntityRefs;
  preparedBy: string;
  preparedAt: TimestampUtc;
  originRunId?: string;
  routeMetadataSnapshot?: RouteMetadataSnapshot;
};
