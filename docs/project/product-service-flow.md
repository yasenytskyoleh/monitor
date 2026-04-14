# Product Service Flow

## Service ownership map
- `SetupDefinitionService`
  - create/update/activate/archive setup definitions
- `ResearchService`
  - create/update/status-update hypotheses
  - attach hypotheses to setup definitions
- `SignalCandidateService`
  - create candidates
  - manage candidate lifecycle status
- `EvaluationService`
  - create/start/finalize/expire/invalidate evaluation results
- `ResearchAggregationService`
  - create pending aggregate results
  - recompute aggregate evidence from evaluation results
  - update aggregate status

## Application orchestration boundary
Application layer coordinates service sequence but does not own domain business logic.

Current coordination entrypoint:
- `createSetupToAggregateFlow`
- `packages/domain-model/src/application/create-setup-to-aggregate-flow.ts`

Boundary rule:
- domain services keep write ownership
- application flow only sequences calls and reports flow-level result

## First manual flow
- setup definition created
- hypothesis created and linked
- signal candidate created
- evaluation result created and finalized
- setup aggregate result created and recomputed

## Partial failure expectations
- failures before aggregation stop the flow (`failed`)
- aggregation-step failure after evaluation yields `partial` and warning
- manual retry can resume from aggregate stage without rewriting domain ownership

## Explicit postponements
- runtime-driven signal creation
- auto-evaluation engine execution
- scheduled aggregation refresh jobs
- API/UI orchestration surfaces
