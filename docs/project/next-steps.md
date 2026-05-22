# Next Steps

## Current recommended next step
### Implement the adapter-backed repository and concrete Prisma adapter for `setup_aggregate_result`

Reason:
- durable relational contracts and committed Prisma schema/migrations now exist for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- `setup_aggregate_result` is the remaining implemented service-owned entity without repository/adapter durable parity
- runtime engines are still intentionally out of scope, so the next bounded step should stay inside persistence infrastructure

## Recommended near-future sequence
1. add the durable adapter contract, mapper layer, and adapter-backed repository for `setup_aggregate_result`
2. add the concrete Prisma adapter for `setup_aggregate_result`
3. add shared integration coverage across setup -> candidate -> evaluation -> aggregate repository flow
4. keep runtime detection/evaluation/aggregation engines deferred until repository/adapter parity is proven for the implemented entities

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing aggregation runtime logic into the `setup_aggregate_result` repository/adapter rollout

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
