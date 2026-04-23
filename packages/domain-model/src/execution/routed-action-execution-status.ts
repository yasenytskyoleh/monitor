export const ROUTED_ACTION_EXECUTION_STATUSES = [
  "prepared",
  "ready",
  "cancelled",
  "failed"
] as const;

export type RoutedActionExecutionStatus =
  (typeof ROUTED_ACTION_EXECUTION_STATUSES)[number];
