# Research Aggregation Model

## Purpose
Define the first research-evidence aggregation model that turns many `EvaluationResult` records into setup-level evidence.

This slice now includes a first persisted aggregate-result implementation and service ownership.
It does not implement aggregation jobs or analytics runtime engines.

## Aggregation input model
Contract:
- `ResearchAggregationInput` (`packages/domain-model/src/research/setup-aggregate-result.ts`)

Inputs include:
- `setupDefinitionId`
- `evaluationResultIds[]`
- `AggregationScope`
- optional `hypothesisId`

## Aggregation scope semantics
Contract:
- `AggregationScope` (`packages/domain-model/src/research/aggregation-scope.ts`)

Scope dimensions:
- setup definition id
- evaluation window id (or `null` for mixed-window scope)
- symbol scope (`single_symbol`, `symbol_set`, `all_monitored`)
- time range (UTC start/end)
- optional research run and hypothesis references

## Aggregate result model
Contract:
- `SetupAggregateResult` (`packages/domain-model/src/research/setup-aggregate-result.ts`)

Persisted structure:
- `id`
- `setupDefinitionId`
- optional `researchHypothesisId`
- `aggregationScope`
- `status`
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

Computation statuses:
- `pending`
- `completed`
- `partial`
- `invalid`

## Minimum aggregate metrics
Contract:
- `AggregateMetrics` (`packages/domain-model/src/research/aggregate-metrics.ts`)

First-version metrics:
- total evaluated candidates
- completed evaluations count
- invalidated evaluations count
- average percentage move
- average absolute move
- average final outcome score
- average max favorable excursion
- average max adverse excursion
- positive vs non-positive outcome counts
- simple hit-rate placeholder

## Hypothesis linkage
Contract:
- `ResearchHypothesisEvidenceLink` (`packages/domain-model/src/research/research-hypothesis-link.ts`)

Evidence statuses:
- `supports`
- `weakens`
- `inconclusive`

This linkage allows a hypothesis to reference aggregate evidence without requiring a scoring engine in this slice.

## Persisted repository and service flow (implemented)
- repository:
  - `InMemorySetupAggregateResultRepository`
  - `packages/domain-model/src/repositories/setup-aggregate-result-repository.impl.ts`
- service:
  - `createResearchAggregationService`
  - `packages/domain-model/src/services/research-aggregation-service.ts`

Implemented service behavior:
- create pending aggregate records with strict reference validation
- recompute aggregate metrics from evaluation-result ids
- enforce aggregate lifecycle transitions (`pending`, `completed`, `partial`, `invalid`)
- reject duplicate aggregate creation for the same `(setupDefinitionId, aggregationScope)`
- validate optional hypothesis linkage
- when `aggregationScope.researchRunId` is set, require the run to exist and match the
  aggregate setup/hypothesis context
- constrain recomputed evaluation results, candidates, and evaluation windows to the
  declared research-run context
- the optional setup-to-aggregate application flow can complete a ResearchRun before creating
  and recomputing an aggregate scoped to that run

## Explicitly postponed
- aggregation execution runtime
- advanced quant metric catalog
- ranking/scoring pipeline
- relational schema/migration implementation
