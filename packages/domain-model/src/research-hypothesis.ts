import type { TimestampUtc } from "./common.js";

export const RESEARCH_HYPOTHESIS_STATUSES = ["draft", "active", "paused", "closed"] as const;
export type ResearchHypothesisStatus = (typeof RESEARCH_HYPOTHESIS_STATUSES)[number];

export type ResearchHypothesis = {
  id: string;
  title: string;
  description: string;
  relatedSetupDefinitionIds: string[];
  assumptions: string[];
  notes: string[];
  status: ResearchHypothesisStatus;
  createdAt: TimestampUtc;
  updatedAt: TimestampUtc;
};
