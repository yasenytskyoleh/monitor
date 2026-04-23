import type { TimestampUtc } from "../common.js";
import type { CompareSetupRevisionsCommand } from "./compare-setup-revisions-command.js";
import type {
  RevisionComparisonMetricDeltas,
  RevisionComparisonMetrics
} from "./revision-comparison-metrics.js";

export const SETUP_REVISION_COMPARISON_STATUSES = [
  "compared",
  "insufficient_evidence"
] as const;

export type SetupRevisionComparisonStatus =
  (typeof SETUP_REVISION_COMPARISON_STATUSES)[number];

export type RevisionEvidenceCounts = {
  candidateCount: number;
  evaluationCount: number;
  aggregateCount: number;
};

export type SetupRevisionComparison = {
  setupFamilyId: string;
  baselineRevisionId: string;
  targetRevisionId: string;
  baselineSetupDefinitionId: string;
  targetSetupDefinitionId: string;
  baselineVersion: number;
  targetVersion: number;
  comparisonScope: CompareSetupRevisionsCommand["comparisonScope"];
  baselineMetrics: RevisionComparisonMetrics;
  targetMetrics: RevisionComparisonMetrics;
  metricDeltas: RevisionComparisonMetricDeltas;
  baselineEvidenceCounts: RevisionEvidenceCounts;
  targetEvidenceCounts: RevisionEvidenceCounts;
  comparedAt: TimestampUtc;
  status: SetupRevisionComparisonStatus;
  notes?: string[];
};
