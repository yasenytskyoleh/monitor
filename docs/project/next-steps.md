# Next Steps

## Current recommended next step
### Select the next later downstream execution/mutation durable slice after `setup_revision_activation_record`

Reason:
- one shared Prisma-backed repository bundle and one opt-in real-Postgres integration path now already span the full implemented product chain through `setup_revision_activation_record`
- `setup_revision_activation_record` now already has implemented in-memory persistence, a committed durable relational contract, Prisma schema/migration coverage, a relational adapter contract, domain/durable mappers, an adapter-backed relational repository, a concrete Prisma adapter, slice-level shared composition, shared implemented-product bundle coverage, and opt-in real-database integration coverage
- the next missing downstream persistence layer is choosing the next later execution/mutation durable slice and committing its contract/schema boundary before another adapter or repository rollout
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused
- the next persistence gap is now the next later downstream execution/mutation durable slice after `setup_revision_activation_record`

## Recommended near-future sequence
1. select the next later downstream execution/mutation entity after `setup_revision_activation_record`
2. commit its durable relational contract and physical schema plan
3. then continue adapter/repository/integration rollout for that slice

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
