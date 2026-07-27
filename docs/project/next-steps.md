# Next Steps

## Current recommended next step
### Run the research-run real-Postgres integration rollout

Reason:
- `research_run` now has relational mappers, a repository adapter, a Prisma adapter, and shared Prisma composition coverage
- the shared integration test seeds a run and verifies its durable row alongside the product workflow
- the real-Postgres test remains environment-gated and should run against the deployment target before durable run writes are enabled
- the research-run migration must be applied through the production migration workflow

## Recommended near-future sequence
1. run `pnpm --filter @monitor/domain-model test:integration` with `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` configured
2. apply `20260727103000_product_domain_research_run_relational_v1` through the deployment migration workflow
3. enable durable research-run writes in the target runtime composition

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
