# Aggregation Refresh Model

## Purpose
Define the first runtime bridge from completed `EvaluationResult` records into controlled aggregate evidence refresh.

This slice defines contracts and handoff coordination only.
It does not implement scheduled aggregation jobs or analytics runtime engines.

## Refresh boundary
Evaluation side provides:
- persisted evaluation-result identity and completion state
- candidate linkage and evaluation window context

Aggregation side provides:
- scope resolution
- aggregate create vs recompute behavior
- aggregate persistence updates through `ResearchAggregationService`

## Trigger input contract
Contract:
- `EvaluationAggregationRefreshTrigger`
- `packages/domain-model/src/runtime-handoff/evaluation-aggregation-refresh-trigger.ts`

Fields:
- `evaluationResultId`
- `signalCandidateId`
- `setupDefinitionId`
- optional `researchHypothesisId`
- `triggeredAt`
- optional `aggregationScopeDescriptor`
- optional `originRunId`
- optional source metadata

## Trigger timing rule (first version)
- only `completed` evaluation results may trigger refresh
- non-completed statuses are rejected with explicit lifecycle outcome
- handling for `expired` / `invalidated` remains documented for later runtime extension

## Scope resolution rule (first version)
- resolved deterministically from:
  - setup definition id (required)
  - evaluation window id (descriptor or evaluation-result fallback)
  - symbol scope (descriptor or single-symbol fallback)
  - time range (descriptor or fixed placeholder range)
- no dynamic slicing/fanout in this slice

## Duplicate and recompute policy
- one aggregate per `(setupDefinitionId, aggregationScope)`
- if aggregate does not exist, create pending aggregate then recompute
- if aggregate exists, recompute existing aggregate (idempotent refresh behavior)
- duplicate "create new aggregate for same scope" is not allowed

## Refresh result contract
Contract:
- `AggregationRefreshResult`
- `packages/domain-model/src/runtime-handoff/aggregation-refresh-result.ts`

Statuses:
- `created_and_refreshed`
- `refreshed_existing`
- `rejected_validation`
- `rejected_lifecycle`
- `failed`
