import type { TimestampUtc } from "../common.js";
import type { ResearchReviewAuthorizedNextAction } from "./research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "./research-review-decision-outcome.js";

export type RouteAcceptedReviewDecisionCommand = {
  researchReviewDecisionId: string;
  setupFamilyId: string;
  setupRevisionId?: string;
  decisionOutcome: ResearchReviewDecisionOutcome;
  authorizedNextAction?: ResearchReviewAuthorizedNextAction;
  routedAt: TimestampUtc;
  originRunId?: string;
};
