import type { TimestampUtc } from "../common.js";
import type { RevisionComparisonScopeDescriptor } from "./compare-setup-revisions-command.js";
import type { RevisionImpactClassification } from "./revision-impact-classification.js";
import type { RevisionMetricDelta } from "./revision-comparison-metrics.js";
import type {
  RevisionEvidenceCounts,
  SetupRevisionComparisonStatus
} from "./setup-revision-comparison.js";

export const REVISION_EVIDENCE_SUFFICIENCY_LEVELS = [
  "sufficient",
  "limited",
  "insufficient"
] as const;

export type RevisionEvidenceSufficiencyLevel =
  (typeof REVISION_EVIDENCE_SUFFICIENCY_LEVELS)[number];

export type RevisionImpactKeyMetricChanges = {
  completedEvaluations: RevisionMetricDelta;
  positiveOutcomeRate: RevisionMetricDelta;
  averagePercentageMove: RevisionMetricDelta;
  averageFinalOutcome: RevisionMetricDelta;
  averageMaxFavorableExcursion: RevisionMetricDelta;
  averageMaxAdverseExcursion: RevisionMetricDelta;
};

export type SetupRevisionImpactSummary = {
  setupFamilyId: string;
  baselineRevisionId: string;
  targetRevisionId: string;
  baselineVersion: number;
  targetVersion: number;
  summaryScope: RevisionComparisonScopeDescriptor | undefined;
  comparisonReference?: {
    revisionComparisonId?: string;
  };
  comparisonStatus: SetupRevisionComparisonStatus;
  impactClassification: RevisionImpactClassification;
  evidenceSufficiency: RevisionEvidenceSufficiencyLevel;
  keyMetricChanges: RevisionImpactKeyMetricChanges;
  baselineEvidenceCounts: RevisionEvidenceCounts;
  targetEvidenceCounts: RevisionEvidenceCounts;
  summaryNotes?: string[];
  warnings?: string[];
  summarizedAt: TimestampUtc;
};
