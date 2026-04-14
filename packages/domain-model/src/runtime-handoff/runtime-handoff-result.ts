export const RUNTIME_HANDOFF_STATUSES = [
  "created",
  "rejected_validation",
  "rejected_duplicate",
  "failed"
] as const;
export type RuntimeHandoffStatus = (typeof RUNTIME_HANDOFF_STATUSES)[number];

export type RuntimeHandoffResult = {
  status: RuntimeHandoffStatus;
  signalCandidateId?: string;
  reason?: string;
  warnings: string[];
};
