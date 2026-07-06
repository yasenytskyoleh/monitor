# Next Steps

## Current recommended next step
### Plan the first durable relational slice for `setup_lifecycle_mutation_record`

Reason:
- one shared Prisma-backed repository bundle and one opt-in real-Postgres integration path now span the full implemented product chain through `routed_action_execution_envelope`
- `setup_lifecycle_mutation_record` already exists as a service-owned domain contract and implemented in-memory audit repository
- no durable relational contract, Prisma schema/migration, or adapter-backed repository exists yet for `setup_lifecycle_mutation_record`
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. define the durable relational contract and physical schema plan for `setup_lifecycle_mutation_record`
2. add the relational adapter contract and Prisma-backed repository rollout for `setup_lifecycle_mutation_record`
3. only then move to later downstream mutation/refinement/activation durable slices

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing later mutation/refinement/activation runtime behavior into the first `setup_lifecycle_mutation_record` durable-slice step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
