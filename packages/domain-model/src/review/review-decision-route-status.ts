export const REVIEW_DECISION_ROUTE_STATUSES = [
  "routed",
  "rejected_validation",
  "rejected_lifecycle",
  "no_action",
  "failed"
] as const;

export type ReviewDecisionRouteStatus =
  (typeof REVIEW_DECISION_ROUTE_STATUSES)[number];
