# Next Steps

## Current recommended next step
### Extend opt-in real-Postgres integration through `setup_revision_activation_record`

Reason:
- one shared Prisma-backed repository bundle now already spans the full implemented product chain through `setup_revision_activation_record`
- `setup_revision_activation_record` now already has implemented in-memory persistence, a committed durable relational contract, Prisma schema/migration coverage, a relational adapter contract, domain/durable mappers, an adapter-backed relational repository, a concrete Prisma adapter, slice-level shared composition, and shared implemented-product bundle coverage
- the next missing downstream persistence layer is the opt-in real-database integration extension that proves the activation slice works in the full-chain Prisma bundle against committed migrations
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused
- the next persistence gap is now opt-in real-Postgres integration through `setup_revision_activation_record`, followed by later downstream execution/mutation durable slices

## Recommended near-future sequence
1. extend the opt-in real-Postgres integration path through `setup_revision_activation_record`
2. only then continue into later downstream execution/mutation durable slices

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
