# Next Steps

## Current recommended next step
### Define the relational adapter contract for `review_decision_routing_result`

Reason:
- `review_decision_routing_result` is now selected as the next downstream execution-handoff persistence slice
- it has a domain contract, in-memory repository, first-class persisted-entity registration, and a durable relational record contract for routable outcomes
- it now has a committed Prisma model, SQL migration, source-review-decision foreign key, and query indexes
- the next missing layer is the adapter boundary that keeps later repositories independent from Prisma storage details
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused
- the shared implemented-product bundle and real-Postgres integration flow remain complete through `setup_revision_activation_record`

## Recommended near-future sequence
1. define the relational adapter contract for `review_decision_routing_result`
2. implement its adapter-backed repository and concrete Prisma adapter
3. extend shared composition and opt-in integration coverage for that slice

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
