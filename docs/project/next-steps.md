# Next Steps

## Current recommended next step
### Define the first later downstream execution/mutation durable slice after `setup_lifecycle_mutation_record`

Reason:
- one shared Prisma-backed repository bundle and one opt-in real-Postgres integration path now span the full implemented product chain through `setup_lifecycle_mutation_record`
- the current implemented product chain now has durable relational parity, shared composition, and shared integration coverage through `setup_lifecycle_mutation_record`
- the remaining persistence gap is now the first later downstream execution/mutation durable slice after `setup_lifecycle_mutation_record`
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. define the first later downstream execution/mutation durable slice after `setup_lifecycle_mutation_record`
2. add its durable contract/schema plus adapter-backed repository rollout
3. only then extend shared composition and opt-in real-Postgres integration through that slice

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing later mutation/refinement/activation runtime behavior into downstream durable-slice planning and rollout work

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
