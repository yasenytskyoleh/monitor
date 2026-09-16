import type { JsonObject, TimestampUtc } from "../common.js";

export const SCHEDULED_JOB_NAMES = ["btc_evaluate", "btc_notify"] as const;
export type ScheduledJobName = (typeof SCHEDULED_JOB_NAMES)[number];

export const SCHEDULED_JOB_RUN_STATUSES = [
  "running",
  "completed",
  "failed",
  "abandoned"
] as const;
export type ScheduledJobRunStatus = (typeof SCHEDULED_JOB_RUN_STATUSES)[number];

export type ScheduledJobRun = {
  runId: string;
  version: number;
  jobName: ScheduledJobName;
  scopeKey: string;
  ownerId: string;
  status: ScheduledJobRunStatus;
  startedAtUtc: TimestampUtc;
  heartbeatAtUtc: TimestampUtc;
  leaseExpiresAtUtc: TimestampUtc;
  completedAtUtc?: TimestampUtc;
  outcomeCode?: string;
  summary?: JsonObject;
  createdAtUtc: TimestampUtc;
  updatedAtUtc: TimestampUtc;
};
