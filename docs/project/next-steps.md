# Next Steps

## Current recommended next step
### Select a new product-domain durable entity

Reason:
- `review_decision_routing_result` has completed its full contract, schema, adapter, shared-composition, and integration rollout
- it has a domain contract, in-memory repository, first-class persisted-entity registration, and a durable relational record contract for routable outcomes
- it now has a committed Prisma model, SQL migration, source-review-decision foreign key, and query indexes
- it now has durable mappers, a domain-facing relational repository, and concrete Prisma persistence
- the shared implemented-product bundle and opt-in real-Postgres integration flow now reach `review_decision_routing_result`
- `routed_action_execution_result` is explicitly product-ephemeral: it is a preparation-service response that can contain incomplete rejected-attempt context, while successful preparation is already retained by `routed_action_execution_envelope`
- runtime engines are still intentionally out of scope, so a retained execution-attempt audit would need a separately declared entity and owner rather than persisting the current response shape

## Recommended near-future sequence
1. select a new product-domain durable entity, or explicitly authorize a retained execution-attempt audit entity
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
