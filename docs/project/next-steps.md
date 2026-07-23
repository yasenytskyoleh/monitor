# Next Steps

## Current recommended next step
### Define the Prisma physical schema and migration for `review_decision_routing_result`

Reason:
- `review_decision_routing_result` is now selected as the next downstream execution-handoff persistence slice
- it has a domain contract, in-memory repository, first-class persisted-entity registration, and a durable relational record contract for routable outcomes
- it remains outside committed Prisma schema/migration coverage, so physical schema planning is the next narrow rollout stage
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused
- the shared implemented-product bundle and real-Postgres integration flow remain complete through `setup_revision_activation_record`

## Recommended near-future sequence
1. commit the Prisma physical schema and SQL migration for `review_decision_routing_result`
2. define its relational adapter contract
3. continue adapter/repository/integration rollout for that slice

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
