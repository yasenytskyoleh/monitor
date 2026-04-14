# Setup Aggregate Result Model

## Purpose
Define the first persisted research-evidence entity that summarizes many evaluation outcomes for a setup under a defined aggregation scope.

`SetupAggregateResult` answers:
- how a setup performs across multiple evaluated cases
- whether evidence is complete, partial, or invalid for the selected scope

## Persisted model (current)
Fields:
- `id`
- `setupDefinitionId`
- optional `researchHypothesisId`
- `aggregationScope`
- `status` (`pending` | `completed` | `partial` | `invalid`)
- `totalCandidates`
- `completedEvaluations`
- `invalidatedEvaluations`
- `averagePercentageMove`
- `averageAbsoluteMove`
- `averageFinalOutcome`
- `averageMaxFavorableExcursion`
- `averageMaxAdverseExcursion`
- `positiveOutcomeCount`
- `computedAt`
- optional `notes`
- `createdAt`
- `updatedAt`

Contract source:
- `packages/domain-model/src/research/setup-aggregate-result.ts`

## Difference from `EvaluationResult`
- `EvaluationResult` stores outcome metrics for one signal candidate and one window.
- `SetupAggregateResult` stores summarized evidence across multiple evaluation results for one setup and one scope.

## Aggregation scope meaning
`aggregationScope` defines the evidence boundary:
- setup definition id
- evaluation window id (or `null`)
- symbol scope (`single_symbol`, `symbol_set`, `all_monitored`)
- time range
- optional run/hypothesis references

## Ownership and write rules
- `ResearchAggregationService` owns:
  - create pending aggregates
  - recompute aggregate metrics from evaluation result ids
  - lifecycle transitions (`pending`, `completed`, `partial`, `invalid`)
  - reference validation (`SetupDefinition`, optional `ResearchHypothesis`)
  - duplicate setup/scope prevention
- `SetupAggregateResultRepository` owns persistence/retrieval only

Implementation references:
- `packages/domain-model/src/services/research-aggregation-service.ts`
- `packages/domain-model/src/repositories/setup-aggregate-result-repository.impl.ts`

## Duplicate policy (current)
- one aggregate result per `(setupDefinitionId, aggregationScope)`
- duplicate create for same setup/scope is rejected
- recomputation happens through controlled service update paths

## Out of scope in this slice
- scheduled aggregation jobs
- advanced statistical significance/scoring logic
- ranking surfaces and dashboards
- orchestration runtime artifact storage
