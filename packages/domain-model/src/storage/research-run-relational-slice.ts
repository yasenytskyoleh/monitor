import type { ResearchRunStatus } from "../research-run.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const RESEARCH_RUN_RELATIONAL_ENTITY_TYPES = ["research_run"] as const;
export type ResearchRunRelationalEntityType =
  (typeof RESEARCH_RUN_RELATIONAL_ENTITY_TYPES)[number];

export type ResearchRunDurableRecord = DurableRelationalRecordBase<"research_run"> & {
  researchRunStatus: ResearchRunStatus;
  hypothesisId: string;
  setupId: string;
  candidateIds: string[];
  evaluationWindowIds: string[];
  evaluationResultIds: string[];
  startedAtUtc: string;
  completedAtUtc: string | null;
  summary: string | null;
};
