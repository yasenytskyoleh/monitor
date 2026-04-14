# Evaluation to Aggregate Flow

## Happy path (first version)
1. `EvaluationResult` is persisted in `completed` status
2. runtime/application layer builds `EvaluationAggregationRefreshTrigger`
3. aggregation scope is resolved deterministically
4. aggregate lookup by `(setupDefinitionId, aggregationScope)` runs
5. if no aggregate exists:
   - create pending `SetupAggregateResult`
   - recompute with relevant completed evaluation ids
6. if aggregate exists:
   - recompute existing aggregate with relevant completed evaluation ids
7. explicit refresh result returns aggregate id and refresh status

Coordinator:
- `createEvaluationToAggregationRefreshHandoff`
- `packages/domain-model/src/runtime-handoff/evaluation-to-aggregation-refresh.ts`

## Ownership boundaries
- evaluation side owns result completion integrity
- aggregation side owns scope resolution, aggregate create/recompute semantics, and status updates
- handoff coordinator orchestrates boundary checks and explicit outcomes only

## Failure boundaries
- missing evaluation result -> validation rejection
- non-completed evaluation status -> lifecycle rejection
- candidate/setup mismatch -> validation rejection
- aggregate validation failure -> validation rejection
- unexpected refresh failure -> failed outcome with retry warning

## Determinism rule
- trigger payload is explicit and structured
- refresh eligibility is explicit (`completed` status only)
- scope resolution is deterministic
- no hidden scoring or LLM-driven logic at this boundary

## Postponed work
- scheduled or batched aggregation runtime
- fanout to multiple scopes
- advanced hypothesis evidence scoring/lifecycle engine
- scoring/ranking/statistical significance runtime
