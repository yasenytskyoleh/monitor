# Outcome Metrics

## Purpose
Define the minimum comparable metrics captured in first-version `EvaluationResult` records.

Contract:
- `EvaluationMetrics` (`packages/domain-model/src/evaluation/evaluation-metrics.ts`)

## Minimum metrics
- `referencePriceAtDetection`
- `highestObservedPriceInWindow`
- `lowestObservedPriceInWindow`
- `finalObservedPriceAtWindowEnd`
- `absoluteMove`
- `percentageMove`
- `maxFavorableExcursion`
- `maxAdverseExcursion`

All fields are nullable in the first version to support explicit partial data handling.

## Usage notes
- metrics are descriptive and comparable, not predictive by themselves
- metrics are attached per `SignalCandidate` + `EvaluationWindow`
- aggregation contracts consume these metrics via `AggregateMetrics` summaries
- setup comparisons should only be interpreted under aligned aggregation scope

## Explicitly postponed
- win-rate and expectancy computation
- risk-adjusted metrics and advanced analytics
- benchmark-relative outcomes
- statistical significance logic
