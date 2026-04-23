import type { SetupRevisionImpactSummary } from "./setup-revision-impact-summary.js";

export const REVISION_IMPACT_SUMMARY_RESULT_STATUSES = [
  "summarized",
  "rejected",
  "failed"
] as const;

export type RevisionImpactSummaryResultStatus =
  (typeof REVISION_IMPACT_SUMMARY_RESULT_STATUSES)[number];

export type RevisionImpactSummaryResult = {
  status: RevisionImpactSummaryResultStatus;
  summary?: SetupRevisionImpactSummary;
  setupFamilyId?: string;
  baselineRevisionId?: string;
  targetRevisionId?: string;
  reason?: string;
  warnings: string[];
};
