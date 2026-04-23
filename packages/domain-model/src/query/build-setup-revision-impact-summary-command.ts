import type { TimestampUtc } from "../common.js";
import type { RevisionComparisonScopeDescriptor } from "./compare-setup-revisions-command.js";
import type { SetupRevisionComparison } from "./setup-revision-comparison.js";

export type BuildSetupRevisionImpactSummaryCommand = {
  setupFamilyId: string;
  baselineRevisionId: string;
  targetRevisionId: string;
  revisionComparisonId?: string;
  comparison?: SetupRevisionComparison;
  summaryScope?: RevisionComparisonScopeDescriptor;
  summarizedAt: TimestampUtc;
  originRunId?: string;
};
