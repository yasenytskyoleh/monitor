# Evaluation Result Model

## Purpose
Define the first persisted outcome layer after signal detection.

`EvaluationResult` is the product-domain record that captures what happened to a single `SignalCandidate` within a specific evaluation window.

It is not:
- a detection record
- a replay/execution artifact
- a scoring or ranking aggregate

## Persisted model (current)
Fields:
- `id`
- `signalCandidateId`
- `evaluationWindowId`
- `status` (`pending` | `in_progress` | `completed` | `expired` | `invalidated`)
- `referencePrice`
- `finalPrice`
- `highInWindow`
- `lowInWindow`
- `absoluteMove`
- `percentageMove`
- `maxFavorableExcursion`
- `maxAdverseExcursion`
- `evaluatedAt`
- optional `notes`
- `createdAt`
- `updatedAt`

Contract source:
- `packages/domain-model/src/evaluation/evaluation-result.ts`

## Ownership and write paths
- `EvaluationService` owns:
  - creation of pending results
  - lifecycle transitions (`pending`, `in_progress`, `completed`, `expired`, `invalidated`)
  - completion/finalization metric validation
  - candidate reference checks and duplicate candidate/window prevention
- `EvaluationResultRepository` owns persistence/retrieval only

Implementation sources:
- `packages/domain-model/src/services/evaluation-service.ts`
- `packages/domain-model/src/repositories/evaluation-result-repository.impl.ts`

## Linkage and duplication rule
- each evaluation result references exactly one `SignalCandidate`
- each evaluation result references exactly one `evaluationWindowId`
- current duplication policy:
  - one result per `(signalCandidateId, evaluationWindowId)` pair
  - duplicate pair creation is rejected

## Boundary rules
- runtime/orchestrator evidence remains separate from product persistence
- optional trace linkage belongs in metadata, not in runtime artifact storage

## Out of scope in this slice
- runtime replay/candle processing engine
- automatic evaluation execution
- aggregation and scoring runtime
- dashboard/reporting behavior
