# Evaluation Trigger Model

## Purpose
Define the first runtime bridge from persisted `SignalCandidate` records into controlled evaluation initiation.

This slice is contract-level only.
It does not implement replay, scheduling, or automatic evaluation completion.

## Trigger boundary
Candidate side provides:
- persisted candidate identity/state
- setup and symbol linkage

Evaluation side provides:
- evaluation window resolution
- pending evaluation-result creation
- transition into in-progress evaluation state

## Trigger input contract
Contract:
- `SignalCandidateEvaluationTrigger`
- `packages/domain-model/src/runtime-handoff/signal-candidate-evaluation-trigger.ts`

Fields:
- `signalCandidateId`
- `setupDefinitionId`
- `monitoredSymbolId`
- `triggeredAt`
- optional `evaluationWindowId`
- optional `evaluationWindowDescriptor`
- optional `originRunId`
- optional trigger reason/source metadata

## Window resolution rule (first version)
- if `evaluationWindowId` is present, use it directly
- otherwise derive a deterministic window id from `evaluationWindowDescriptor`
- if neither is present, reject trigger

No adaptive or regime-based window logic is introduced in this slice.

## Ownership boundaries
- Candidate side owns persisted candidate lifecycle before trigger
- Evaluation side owns `EvaluationResult` initiation (`pending` -> `in_progress`)
- Orchestrator/runtime artifacts remain separate from product-domain persistence

## Lifecycle interaction rule (first version)
- candidates in `detected` or `under_review` may trigger evaluation
- if candidate is `detected`, trigger path moves it to `under_review` before evaluation start
- candidates in terminal states (for example `discarded`, `evaluated`) are rejected

## Trigger result contract
Contract:
- `EvaluationTriggerResult`
- `packages/domain-model/src/runtime-handoff/evaluation-trigger-result.ts`

Statuses:
- `started`
- `rejected_validation`
- `rejected_lifecycle`
- `rejected_duplicate`
- `failed`

## Failure behavior
- missing candidate -> `rejected_validation`
- setup/symbol mismatch in trigger payload -> `rejected_validation`
- invalid candidate lifecycle state -> `rejected_lifecycle`
- duplicate candidate/window trigger -> `rejected_duplicate`
- unexpected runtime/service failure -> `failed` with retry warning
