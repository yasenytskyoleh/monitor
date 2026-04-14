import type { DomainEntityBase, TimestampUtc } from "./common.js";

export const RESEARCH_RUN_STATUSES = ["planned", "running", "completed", "failed", "cancelled"] as const;
export type ResearchRunStatus = (typeof RESEARCH_RUN_STATUSES)[number];

export type ResearchRun = DomainEntityBase & {
  runId: string;
  hypothesisId: string;
  setupId: string;
  candidateIds: string[];
  evaluationWindowIds: string[];
  evaluationResultIds: string[];
  status: ResearchRunStatus;
  startedAtUtc: TimestampUtc;
  completedAtUtc?: TimestampUtc;
  summary?: string;
};
