# Next Steps

## Current recommended next step
### Add the domain/durable mappers, adapter-backed repository, and concrete Prisma adapter for `research_decision_approval`

Reason:
- the full implemented research chain now has:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
- one shared Prisma-backed repository bundle and one end-to-end integration path now span that full chain
- the next downstream service-owned persistence gap is `research_decision_approval`
- that entity already exists in the domain model and in implemented in-memory persistence
- it now has a durable relational contract, committed Prisma schema and migration artifacts, and a repository adapter contract
- it still has no domain/durable mappers, adapter-backed repository, or concrete Prisma adapter rollout
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. add the domain/durable mappers, adapter-backed repository, and concrete Prisma adapter for `research_decision_approval`
2. extend the shared implemented-product bundle through approvals only after the approval repository slice is verified
3. add opt-in real-Postgres integration coverage for the approval slice and shared bundle extension
4. keep later review/execution entities deferred until the approval slice pattern is verified

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing setup-mutation or refinement execution behavior into the approval-adapter step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
