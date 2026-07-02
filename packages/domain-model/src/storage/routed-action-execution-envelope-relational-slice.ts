import type {
  RouteMetadataSnapshot,
  RoutedActionTargetEntityRefs
} from "../execution/build-routed-action-execution-envelope-command.js";
import type {
  RoutedActionExecutionPayloadSnapshot
} from "../execution/routed-action-execution-envelope.js";
import type { RoutedActionExecutionStatus } from "../execution/routed-action-execution-status.js";
import type { DownstreamActionTarget } from "../review/downstream-action-target.js";
import type { ReviewDecisionDownstreamCommandType } from "../review/review-decision-routing-result.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ENTITY_TYPES = [
  "routed_action_execution_envelope"
] as const;
export type RoutedActionExecutionEnvelopeRelationalEntityType =
  (typeof ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_ENTITY_TYPES)[number];

export type RoutedActionExecutionEnvelopeDurableRecord =
  DurableRelationalRecordBase<"routed_action_execution_envelope"> & {
    executionStatus: RoutedActionExecutionStatus;
    sourceRoutingResultId: string;
    sourceReviewDecisionId: string;
    actionTarget: DownstreamActionTarget;
    actionCommandType: ReviewDecisionDownstreamCommandType;
    targetEntityRefs: RoutedActionTargetEntityRefs;
    routeMetadataSnapshot: RouteMetadataSnapshot;
    executionPayloadSnapshot: RoutedActionExecutionPayloadSnapshot;
    preparedBy: string;
    preparedAtUtc: string;
    originRunId: string | null;
    notes: string | null;
  };
