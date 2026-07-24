# Next Steps

## Current recommended next step
### Implement the monitored-symbol Prisma physical schema and migration

Reason:
- `monitored_symbol` is the remaining first-class product-persisted entity without durable relational parity
- it now has implemented in-memory persistence and a concrete monitoring-catalog service write path
- it now has a durable relational contract for catalog identity, status, tags, and source bindings
- it is referenced by durable signal candidates, so schema work must preserve its catalog identity without changing signal-candidate semantics
- `routed_action_execution_result` remains explicitly product-ephemeral and is not a substitute persistence slice

## Recommended near-future sequence
1. commit the `monitored_symbol` Prisma physical schema and migration
2. define its relational adapter contract
3. continue its mapper, repository, shared-composition, and integration rollout

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
