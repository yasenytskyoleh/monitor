import type { SetupRevisionComparison } from "./setup-revision-comparison.js";

export const REVISION_COMPARISON_RESULT_STATUSES = [
  "compared",
  "insufficient_evidence",
  "rejected",
  "failed"
] as const;

export type RevisionComparisonResultStatus =
  (typeof REVISION_COMPARISON_RESULT_STATUSES)[number];

export type RevisionComparisonResult = {
  status: RevisionComparisonResultStatus;
  comparison?: SetupRevisionComparison;
  setupFamilyId?: string;
  baselineRevisionId?: string;
  targetRevisionId?: string;
  reason?: string;
  warnings: string[];
};
