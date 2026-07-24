# Next Steps

## Current recommended next step
### Select the next later downstream durable slice

Reason:
- `review_decision_routing_result` is now selected as the next downstream execution-handoff persistence slice
- it has a domain contract, in-memory repository, first-class persisted-entity registration, and a durable relational record contract for routable outcomes
- it now has a committed Prisma model, SQL migration, source-review-decision foreign key, and query indexes
- it now has durable mappers, a domain-facing relational repository, and concrete Prisma persistence
- the shared implemented-product bundle and opt-in real-Postgres integration flow now reach `review_decision_routing_result`
- the next bounded persistence step is choosing the next later downstream durable slice
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused
- the shared implemented-product bundle and real-Postgres integration flow both reach `review_decision_routing_result`

## Recommended near-future sequence
1. select the next later downstream durable slice
2. commit its durable relational contract and physical schema plan
3. continue its adapter, repository, shared-composition, and integration rollout

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing activation workflow semantics or later mutation/refinement runtime behavior into downstream durable-slice planning and rollout work

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
