# Evaluation Model

## Purpose
Define the first post-detection evaluation model for Monitor.

This slice defines contracts only. It does not implement replay, storage, aggregation, or scoring engines.

## Evaluation flow boundary
1. setup detection creates `SignalCandidate`
2. evaluation consumes `SignalCandidate` + `EvaluationWindow` + observation references
3. evaluation produces `EvaluationResult`
4. future statistics/scoring layers aggregate multiple `EvaluationResult` records

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

Required shape:
- candidate and window references
- evaluation status
- outcome summary
- minimum evaluation metrics bundle
- evaluated timestamp
- limitations and notes

## Evaluation statuses
- `pending`
- `in_progress`
- `completed`
- `expired`
- `invalidated`

## Explicitly postponed
- runtime evaluation engine
- candle replay and sampling implementation
- persistence model and DB migrations
- aggregation and scoring model
- ranking/reporting/UI behavior
