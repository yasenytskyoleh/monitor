# First Application Flow

## Purpose
Define the first minimal end-to-end product application flow that coordinates persisted domain services without introducing live market runtime.

This flow is intentionally:
- manual/service-driven
- narrow
- testable

## Happy path steps
1. `SetupDefinitionService.createSetupDefinition`
2. `ResearchService.createResearchHypothesis`
3. `ResearchService.attachHypothesisToSetupDefinitions`
4. `SignalCandidateService.createSignalCandidate`
5. `EvaluationService.createPendingEvaluationResult`
6. `EvaluationService.startEvaluationResult`
7. `EvaluationService.finalizeEvaluationResult`
8. `ResearchAggregationService.createPendingSetupAggregateResult`
9. `ResearchAggregationService.recomputeSetupAggregateResult`

This sequence is coordinated by:
- `packages/domain-model/src/application/create-setup-to-aggregate-flow.ts`

## Input contract
`SetupToAggregateFlowInput` includes:
- setup definition payload
- hypothesis payload
- signal candidate payload
- evaluation payload (pending result + finalize parameters)
- aggregation payload (pending aggregate + evaluation-result ids)
- shared product metadata

Contract source:
- `packages/domain-model/src/application/application-flow-input.ts`

## Output contract
`SetupToAggregateFlowResult` returns:
- flow status (`completed`, `partial`, `failed`)
- created ids by step
- completed step list
- failed step (if any)
- warnings and optional error string

Contract source:
- `packages/domain-model/src/application/application-flow-result.ts`

## Failure boundaries
Blocking failures (flow stops with `failed`):
- setup creation failure
- hypothesis creation/link failure
- candidate creation failure
- evaluation create/start/finalize failure

Non-blocking failure (flow returns `partial`):
- aggregate create/recompute failure after evaluation finalized
- warning instructs manual aggregation retry

Rationale:
- preserve earlier persisted product records
- avoid introducing transaction orchestration complexity in this slice

## Out of scope
- live ingestion/detection runtime
- automated evaluation runtime
- background aggregation jobs/schedulers
- event bus/worker orchestration
- APIs/UI
