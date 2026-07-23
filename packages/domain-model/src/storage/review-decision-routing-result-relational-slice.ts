import type { ResearchReviewAuthorizedNextAction } from "../review/research-review-decision.js";
import type { ResearchReviewDecisionOutcome } from "../review/research-review-decision-outcome.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ENTITY_TYPES = [
  "review_decision_routing_result"
] as const;
export type ReviewDecisionRoutingResultRelationalEntityType =
  (typeof REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_ENTITY_TYPES)[number];

export type ReviewDecisionRoutingResultDurableRecord =
  DurableRelationalRecordBase<"review_decision_routing_result"> & {
    routingStatus: "routed" | "no_action";
    researchReviewDecisionId: string;
    setupFamilyId: string;
    setupRevisionId: string | null;
    decisionOutcome: ResearchReviewDecisionOutcome;
    authorizedNextAction: ResearchReviewAuthorizedNextAction | null;
    target: DownstreamActionTarget | null;
    downstreamCommandType: ReviewDecisionDownstreamCommandType;
    routedAtUtc: string;
    reason: string | null;
    warnings: string[];
  };
