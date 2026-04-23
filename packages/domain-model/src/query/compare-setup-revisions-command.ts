import type { TimestampUtc } from "../common.js";
import type { QueryTimeRange } from "./query-setup-revision-history.js";

export type RevisionComparisonScopeDescriptor = {
  evaluationWindowId?: string;
  symbolIds?: string[];
  timeRange?: QueryTimeRange;
};

export type CompareSetupRevisionsCommand = {
  setupFamilyId: string;
  baselineRevisionId: string;
  targetRevisionId: string;
  comparisonScope?: RevisionComparisonScopeDescriptor;
  comparedAt: TimestampUtc;
  originRunId?: string;
};
