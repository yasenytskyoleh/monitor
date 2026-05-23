# Next Steps

## Current recommended next step
### Define the durable relational contract for `research_decision_approval`

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
- that entity already exists in the domain model and in implemented in-memory persistence, but it still has no durable relational contract or physical schema planning
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. define the logical durable relational storage contract for `research_decision_approval`
2. define the physical Prisma schema and SQL migration layout for that approval entity
3. add the adapter-backed repository and concrete Prisma adapter after the contract/schema are approved
4. keep later review/execution entities deferred until the approval slice pattern is verified

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing setup-mutation or refinement execution behavior into the approval-contract step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
