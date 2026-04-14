export type AggregateMetrics = {
  totalEvaluatedCandidates: number;
  completedEvaluationsCount: number;
  invalidatedEvaluationsCount: number;
  positiveOutcomeCount: number;
  nonPositiveOutcomeCount: number;
  averagePercentageMove: number | null;
  averageAbsoluteMove: number | null;
  averageFinalOutcomeScore: number | null;
  averageMaxFavorableExcursion: number | null;
  averageMaxAdverseExcursion: number | null;
  simpleHitRate: number | null;
};
