import type { DomainEntityBase, TimestampUtc } from "./common.js";

export const RESEARCH_HYPOTHESIS_STATUSES = ["draft", "active", "paused", "closed"] as const;
export type ResearchHypothesisStatus = (typeof RESEARCH_HYPOTHESIS_STATUSES)[number];

export type ResearchHypothesis = DomainEntityBase & {
  hypothesisId: string;
  title: string;
  statement: string;
  relatedSetupIds: string[];
  successCriteria: string[];
  status: ResearchHypothesisStatus;
  notes?: string;
  lastReviewedAtUtc?: TimestampUtc;
};
