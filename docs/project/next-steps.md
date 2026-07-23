# Next Steps

## Current recommended next step
### Extend opt-in real-Postgres integration through `review_decision_routing_result`

Reason:
- `review_decision_routing_result` is now selected as the next downstream execution-handoff persistence slice
- it has a domain contract, in-memory repository, first-class persisted-entity registration, and a durable relational record contract for routable outcomes
- it now has a committed Prisma model, SQL migration, source-review-decision foreign key, and query indexes
- it now has durable mappers, a domain-facing relational repository, and concrete Prisma persistence
- the shared implemented-product bundle now exposes the routing-result repository and Prisma adapter
- the next missing layer is opt-in real-Postgres coverage
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused
- the shared implemented-product bundle now reaches `review_decision_routing_result`; the real-Postgres integration flow remains complete through `setup_revision_activation_record`

## Recommended near-future sequence
1. extend opt-in real-Postgres integration coverage for `review_decision_routing_result`

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
