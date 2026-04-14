export type EvaluationMetrics = {
  referencePriceAtDetection: number | null;
  highestObservedPriceInWindow: number | null;
  lowestObservedPriceInWindow: number | null;
  finalObservedPriceAtWindowEnd: number | null;
  absoluteMove: number | null;
  percentageMove: number | null;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
};
