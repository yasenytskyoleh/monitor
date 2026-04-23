export type RevisionComparisonMetrics = {
  totalEvaluatedCandidates: number;
  completedEvaluations: number;
  invalidatedEvaluations: number;
  averagePercentageMove: number | null;
  averageAbsoluteMove: number | null;
  averageFinalOutcome: number | null;
  averageMaxFavorableExcursion: number | null;
  averageMaxAdverseExcursion: number | null;
  positiveOutcomeCount: number;
  positiveOutcomeRate: number | null;
};

export type RevisionMetricDelta = {
  baseline: number | null;
  target: number | null;
  delta: number | null;
};

export type RevisionComparisonMetricDeltas = {
  totalEvaluatedCandidates: RevisionMetricDelta;
  completedEvaluations: RevisionMetricDelta;
  invalidatedEvaluations: RevisionMetricDelta;
  averagePercentageMove: RevisionMetricDelta;
  averageAbsoluteMove: RevisionMetricDelta;
  averageFinalOutcome: RevisionMetricDelta;
  averageMaxFavorableExcursion: RevisionMetricDelta;
  averageMaxAdverseExcursion: RevisionMetricDelta;
  positiveOutcomeCount: RevisionMetricDelta;
  positiveOutcomeRate: RevisionMetricDelta;
};
