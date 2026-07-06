# Next Steps

## Current recommended next step
### Extend shared composition and opt-in real-Postgres integration through `setup_lifecycle_mutation_record`

Reason:
- one shared Prisma-backed repository bundle and one opt-in real-Postgres integration path now span the full implemented product chain through `routed_action_execution_envelope`
- `setup_lifecycle_mutation_record` now has a service-owned domain contract, implemented in-memory audit repository, durable relational contract, committed Prisma schema/migration, committed repository adapter contract, domain/durable mappers, an adapter-backed relational repository, a concrete Prisma adapter, and slice-level shared composition
- the shared implemented-product bundle and opt-in real-Postgres integration coverage are still missing for `setup_lifecycle_mutation_record`
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. extend shared composition and opt-in real-Postgres integration through `setup_lifecycle_mutation_record`
2. only then move to later downstream execution and mutation durable slices

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing later mutation/refinement/activation runtime behavior into the `setup_lifecycle_mutation_record` shared composition and integration extension

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
