# Evaluation Model

## Purpose
Define the first post-detection evaluation model for Monitor.

This slice includes persisted evaluation-result implementation with explicit service and repository
ownership, plus a bounded batch runtime for normalized 5m closed candles. It still does not
implement replay storage, aggregation, or scoring engines.

## Evaluation flow boundary
1. setup detection creates `SignalCandidate`
2. evaluation consumes `SignalCandidate` + `EvaluationWindow` + observation references
3. evaluation produces `EvaluationResult`
4. research aggregation consumes many `EvaluationResult` records into setup evidence
5. future statistics/scoring layers may build on that aggregate evidence

## Evaluation input model
Contract:
- `EvaluationInput` (`packages/domain-model/src/evaluation/evaluation-input.ts`)

Input model references:
- one `signalCandidateId`
- one `evaluationWindowId`
- observation references (normalized-event expectations by source/type)
- optional context and known limitations

This allows evaluation contracts to be explicit before replay/runtime implementation exists.

## Evaluation window contract
Contract:
- `EvaluationWindow` (`packages/domain-model/src/evaluation/evaluation-window.ts`)

First version rules:
- mode is fixed to `time_based`
- start reference rule is fixed to `signal_detected_at`
- window can be represented by explicit end timestamp and/or duration fields
- purpose is explicit text for later filtering/comparison

## Evaluation result contract
Contract:
- `EvaluationResult` (`packages/domain-model/src/evaluation/evaluation-result.ts`)

Persisted shape (minimum):
- `id`
- `signalCandidateId`
- `evaluationWindowId`
- `status`
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

Implementation references:
- `packages/domain-model/src/repositories/evaluation-result-repository.impl.ts`
- `packages/domain-model/src/services/evaluation-service.ts`

## Evaluation statuses
- `pending`
- `in_progress`
- `completed`
- `expired`
- `invalidated`

## Lifecycle rules (implemented)
- evaluation result starts as `pending`
- `pending` -> `in_progress` | `expired` | `invalidated`
- `in_progress` -> `completed` | `expired` | `invalidated`
- `completed` -> `invalidated` (explicit correction path only)
- invalid transitions are rejected by service validation

## Consistency and reference validation (implemented)
- `signalCandidateId` must reference an existing persisted `SignalCandidate`
- duplicate `(signalCandidateId, evaluationWindowId)` creation is rejected
- `completed` requires full metric inputs
- metric consistency checks include:
  - `highInWindow >= lowInWindow`
  - `referencePrice` and `finalPrice` must be within `[lowInWindow, highInWindow]`
  - `maxFavorableExcursion >= 0`
  - `maxAdverseExcursion <= 0`

## Explicitly postponed
- live evaluation workers, replay, and sampling implementation
- DB migrations and relational adapter implementation
- aggregation/scoring runtime engines
- ranking/reporting/UI behavior
